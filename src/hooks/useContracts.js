// src/hooks/useContracts.js
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONFIG, ERC20_ABI, GAME_ABI } from "../lib/config";
import { CROPS } from "../lib/gameData";

export function useContracts(wallet, showToast, addLog, refreshBalances) {
  const [inventory, setInventory]     = useState({});
  const [buyingSeeds, setBuying]      = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const BACKEND = CONFIG.BACKEND_URL || "http://localhost:3001";

  // ── Load inventory from BACKEND (Supabase) ──
  // Contract tracks purchase, backend tracks what's left to plant
  const loadInventory = useCallback(async (w) => {
    const target = w || wallet;
    if (!target) return;
    try {
      const res = await fetch(`${BACKEND}/api/inventory/${target.address}`);
      if (!res.ok) throw new Error("Failed to load inventory");
      const { inventory: inv } = await res.json();
      setInventory(inv);
      return inv;
    } catch (e) {
      console.error("loadInventory:", e);
      // Fallback: all zero
      const inv = {};
      Object.keys(CROPS).forEach(k => inv[k] = 0);
      setInventory(inv);
      return inv;
    }
  }, [wallet, BACKEND]);

  // ── Buy seeds — backend signs price, then on-chain purchase ──
  const buySeeds = useCallback(async (cropKey, qty) => {
    if (!wallet) { showToast("Connect wallet first!", "#e04040"); return; }
    const c = CROPS[cropKey];
    setBuying(cropKey);
    try {
      // 1. Get operator signature from backend
      showToast("⏳ Preparing purchase…", "#f0c060");
      const signRes = await fetch(`${BACKEND}/api/sign-purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, cropKey, qty }),
      });
      if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.error || "Signing failed");
      }
      const { totalWei, nonce, signature } = await signRes.json();

      const token = new ethers.Contract(CONFIG.PLOT_TOKEN_ADDRESS, ERC20_ABI, wallet.signer);
      const game  = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, wallet.signer);

      // 2. Approve exact amount signed by backend
      const allowance = await token.allowance(wallet.address, CONFIG.GAME_CONTRACT_ADDRESS);
      if (BigInt(allowance) < BigInt(totalWei)) {
        showToast("⏳ Approving $PLOT…", "#f0c060");
        const approveTx = await token.approve(CONFIG.GAME_CONTRACT_ADDRESS, BigInt(totalWei));
        await approveTx.wait();
      }

      // 3. Submit on-chain with signature
      showToast("⏳ Buying seeds…", "#f0c060");
      const tx = await game.buySeed(c.id, qty, BigInt(totalWei), BigInt(nonce), signature);
      await tx.wait();

      // 4. Sync to backend inventory
      await fetch(`${BACKEND}/api/add-seeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, cropKey, qty }),
      });

      showToast(`✅ Bought ${qty}× ${c.name}!`, "#4caf50");
      addLog(`🛒 Bought ${qty}× ${c.name} [−${c.seedCost * qty} $PLOT]`);
      await loadInventory();
      await refreshBalances();
    } catch (e) {
      showToast(e.reason || e.message || "Transaction failed", "#e04040");
      console.error("buySeeds:", e);
    }
    setBuying(null);
  }, [wallet, BACKEND, showToast, addLog, loadInventory, refreshBalances]);

  // ── Harvest — FREE off-chain ──────────────────
  const harvestOffChain = useCallback(async (cropKey) => {
    if (!wallet) return null;
    try {
      const res = await fetch(`${BACKEND}/api/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, cropKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Harvest failed");
      }
      return await res.json();
    } catch (e) {
      console.error("harvestOffChain:", e);
      showToast(e.message || "Harvest failed", "#e04040");
      return null;
    }
  }, [wallet, BACKEND, showToast]);

  // ── Spend seed — tells backend to decrement ──
  const spendSeedOnBackend = useCallback(async (cropKey) => {
    if (!wallet) return false;
    try {
      const res = await fetch(`${BACKEND}/api/spend-seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, cropKey }),
      });
      if (!res.ok) return false;
      const { remaining } = await res.json();
      // Update local state immediately
      setInventory(prev => ({ ...prev, [cropKey]: remaining }));
      return true;
    } catch (e) {
      console.error("spendSeed:", e);
      return false;
    }
  }, [wallet, BACKEND]);

  // ── Withdraw ──────────────────────────────────
  const withdrawEarnings = useCallback(async () => {
    if (!wallet) return;
    setWithdrawing(true);
    try {
      showToast("⏳ Preparing withdrawal…", "#f0c060");
      const signRes = await fetch(`${BACKEND}/api/sign-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address }),
      });

      if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.error || "Signing failed");
      }

      const { signature, amount, nonce, pendingEarnings } = await signRes.json();

      const game     = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, wallet.signer);
      const cooldown = await game.withdrawCooldownRemaining(wallet.address);
      if (cooldown > 0n) {
        const mins = Math.ceil(Number(cooldown) / 60);
        showToast(`⏳ Cooldown: ${mins} min remaining`, "#f0c060");
        setWithdrawing(false);
        return;
      }

      showToast("⏳ Submitting to blockchain…", "#f0c060");
      const addTx = await game.addEarnings(wallet.address, amount, nonce, signature);
      await addTx.wait();

      const wdTx = await game.withdraw(amount);
      await wdTx.wait();

      await fetch(`${BACKEND}/api/confirm-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, txHash: wdTx.hash }),
      });

      showToast(`✅ Withdrew ${pendingEarnings} $PLOT!`, "#4caf50");
      addLog(`💸 Withdrew ${pendingEarnings} $PLOT to wallet`);
      await refreshBalances();
    } catch (e) {
      console.error("withdraw:", e);
      showToast(e.reason || e.message || "Withdraw failed", "#e04040");
    }
    setWithdrawing(false);
  }, [wallet, BACKEND, showToast, addLog, refreshBalances]);

  // Local optimistic spend (for immediate UI feedback)
  const spendSeed = useCallback((cropKey) => {
    setInventory(prev => ({
      ...prev,
      [cropKey]: Math.max(0, (prev[cropKey] || 0) - 1),
    }));
  }, []);

  return {
    inventory, buyingSeeds, withdrawing,
    loadInventory, buySeeds, harvestOffChain,
    withdrawEarnings, spendSeed, spendSeedOnBackend,
  };
}
