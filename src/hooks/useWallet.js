// src/hooks/useWallet.js
// Supports MetaMask + WalletConnect (mobile wallets: Bitget, OKX, Trust, etc)
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONFIG, ERC20_ABI, GAME_ABI } from "../lib/config";

// WalletConnect Project ID — daftar gratis di https://cloud.walletconnect.com
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

export function useWallet() {
  const [wallet, setWallet]           = useState(null);
  const [plotBalance, setPlotBalance] = useState(0n);
  const [gameBalance, setGameBalance] = useState(0n);
  const [connecting, setConnecting]   = useState(false);
  const [wrongChain, setWrongChain]   = useState(false);
  const [connectType, setConnectType] = useState(null); // "metamask" | "walletconnect"

  const loadBalances = useCallback(async (address, provider) => {
    try {
      const token = new ethers.Contract(CONFIG.PLOT_TOKEN_ADDRESS, ERC20_ABI, provider);
      setPlotBalance(await token.balanceOf(address));
    } catch { setPlotBalance(0n); }
    try {
      const game = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, provider);
      setGameBalance(await game.getGameBalance(address));
    } catch { setGameBalance(0n); }
  }, []);

  const setupWallet = useCallback(async (provider) => {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CONFIG.BASE_CHAIN_ID) {
      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: `0x${CONFIG.BASE_CHAIN_ID.toString(16)}` }
        ]);
      } catch {
        try {
          await provider.send("wallet_addEthereumChain", [{
            chainId:         `0x${CONFIG.BASE_CHAIN_ID.toString(16)}`,
            chainName:       "Base",
            nativeCurrency:  { name:"ETH", symbol:"ETH", decimals:18 },
            rpcUrls:         ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }]);
        } catch (e) {
          throw new Error("Please switch to Base network");
        }
      }
    }
    const signer  = await provider.getSigner();
    const address = await signer.getAddress();
    return { address, provider, signer };
  }, []);

  // ── MetaMask / Browser Wallet ─────────────────
  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not found! Install MetaMask or use WalletConnect.");
      return null;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const w = await setupWallet(provider);
      setWallet(w);
      setConnectType("metamask");
      setWrongChain(false);
      await loadBalances(w.address, w.provider);
      return w;
    } catch (e) {
      console.error("MetaMask connect:", e);
      return null;
    } finally {
      setConnecting(false);
    }
  }, [setupWallet, loadBalances]);

  // ── WalletConnect (mobile wallets) ───────────
  const connectWalletConnect = useCallback(async () => {
    setConnecting(true);
    try {
      // Dynamic import — only load when needed
      const { EthereumProvider } = await import("@walletconnect/ethereum-provider");

      const wcProvider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains:    [CONFIG.BASE_CHAIN_ID],
        showQrModal: true,
        metadata: {
          name:        "PixelPlot",
          description: "Web3 Farming Game on Base",
          url:         window.location.origin,
          icons:       [`${window.location.origin}/favicon.ico`],
        },
      });

      await wcProvider.connect();
      const provider = new ethers.BrowserProvider(wcProvider);
      const w        = await setupWallet(provider);

      setWallet(w);
      setConnectType("walletconnect");
      setWrongChain(false);
      await loadBalances(w.address, w.provider);
      return w;
    } catch (e) {
      console.error("WalletConnect:", e);
      return null;
    } finally {
      setConnecting(false);
    }
  }, [setupWallet, loadBalances]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setPlotBalance(0n);
    setGameBalance(0n);
    setConnectType(null);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    await loadBalances(wallet.address, wallet.provider);
  }, [wallet, loadBalances]);

  const addGameBalance = useCallback((amount) => {
    setGameBalance(prev => prev + amount);
  }, []);

  return {
    wallet, plotBalance, gameBalance,
    connecting, wrongChain, connectType,
    connectMetaMask, connectWalletConnect,
    connect: connectMetaMask, // backward compat
    disconnect, refreshBalances, addGameBalance,
  };
}
