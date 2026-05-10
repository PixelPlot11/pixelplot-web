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

  // ── Load seed inventory from contract ──────────
  const loadInventory = useCallback(async (w) => {
    const target = w || wallet;
    if (!target) return;
    try {
      const game = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, target.provider);
      const all  = await game.getAllSeeds(target.address);
      const inv  = {};
      Object.entries(CROPS).forEach(([key, c]) => { inv[key] = Number(all[c.id]); });
      setInventory(inv);
      return inv;
    } catch (e) {
      const inv = {};
      Object.keys(CROPS).forEach(k => inv[k] = 0);
      setInventory(inv);
      return inv;
    }
  }, [wallet]);

  // ── Buy seeds ──────────────────────────────────
  const buySeeds = useCallback(async (cropKey, qty) => {
    if (!wallet) { showToast("Connect wallet first!", "#e04040"); return; }
    const c         = CROPS[cropKey];
    const totalCost = BigInt(c.seedCost * qty) * 10n ** 18n;
    setBuying(cropKey);
    try {
      const token = new ethers.Contract(CONFIG.PLOT_TOKEN_ADDRESS, ERC20_ABI, wallet.signer);
      const game  = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, wallet.signer);
      const allowance = await token.allowance(wallet.address, CONFIG.GAME_CONTRACT_ADDRESS);
      if (allowance < totalCost) {
        showToast("⏳ Approving $PLOT…", "#f0c060");
        const tx = await token.approve(CONFIG.GAME_CONTRACT_ADDRESS, totalCost);
        await tx.wait();
      }
      showToast("⏳ Buying seeds…", "#f0c060");
      const tx = await game.buySeed(c.id, qty);
      await tx.wait();
      showToast(`✅ Bought ${qty}× ${c.name}!`, "#4caf50");
      addLog(`🛒 Bought ${qty}× ${c.name} [−${c.seedCost * qty} $PLOT]`);
      await loadInventory();
      await refreshBalances();
    } catch (e) {
      showToast(e.reason || "Transaction failed", "#e04040");
    }
    setBuying(null);
  }, [wallet, showToast, addLog, loadInventory, refreshBalances]);

  // ── Harvest — FREE, off-chain only ─────────────
  // Just calls backend to record earnings in Supabase
  // No gas, no wallet popup!
  const harvestOffChain = useCallback(async (cropKey) => {
    if (!wallet) return null;
    try {
      const res = await fetch(`${BACKEND}/api/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: wallet.address,
          cropKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Harvest failed");
      }
      const data = await res.json();
      return data; // { earned, expGain, pendingEarnings, newExp }
    } catch (e) {
      console.error("harvestOffChain:", e);
      showToast(e.message || "Harvest recording failed", "#e04040");
      return null;
    }
  }, [wallet, BACKEND, showToast]);

  // ── Withdraw — sign accumulated earnings + 1 tx ─
  const withdrawEarnings = useCallback(async () => {
    if (!wallet) return;
    setWithdrawing(true);
    try {
      // Step 1: Ask backend to sign total pending earnings
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

      // Step 2: Check withdraw cooldown
      const game     = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, wallet.signer);
      const cooldown = await game.withdrawCooldownRemaining(wallet.address);
      if (cooldown > 0n) {
        const mins = Math.ceil(Number(cooldown) / 60);
        showToast(`⏳ Cooldown: ${mins} min remaining`, "#f0c060");
        setWithdrawing(false);
        return;
      }

      // Step 3: Submit addEarnings + withdraw in sequence
      showToast("⏳ Submitting to blockchain…", "#f0c060");

      // addEarnings — credits user's game balance
      const addTx = await game.addEarnings(wallet.address, amount, nonce, signature);
      await addTx.wait();

      // withdraw — sends $PLOT to wallet
      const wdTx = await game.withdraw(amount);
      await wdTx.wait();

      // Step 4: Confirm to backend — clears pending
      await fetch(`${BACKEND}/api/confirm-withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: wallet.address, txHash: wdTx.hash }),
      });

      showToast(`✅ Withdrew ${pendingEarnings} $PLOT to wallet!`, "#4caf50");
      addLog(`💸 Withdrew ${pendingEarnings} $PLOT to wallet`);
      await refreshBalances();

    } catch (e) {
      console.error("withdraw:", e);
      showToast(e.reason || e.message || "Withdraw failed", "#e04040");
    }
    setWithdrawing(false);
  }, [wallet, BACKEND, showToast, addLog, refreshBalances]);

  // Optimistic local seed spend after planting
  const spendSeed = useCallback((cropKey) => {
    setInventory(prev => ({
      ...prev,
      [cropKey]: Math.max(0, (prev[cropKey] || 0) - 1),
    }));
  }, []);

  return {
    inventory, buyingSeeds, withdrawing,
    loadInventory, buySeeds, harvestOffChain,
    withdrawEarnings, spendSeed,
  };
}
