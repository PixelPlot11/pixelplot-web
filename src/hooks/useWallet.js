// src/hooks/useWallet.js
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONFIG, ERC20_ABI, GAME_ABI } from "../lib/config";

export function useWallet() {
  const [wallet, setWallet]           = useState(null);
  const [plotBalance, setPlotBalance] = useState(0n);
  const [gameBalance, setGameBalance] = useState(0n);
  const [connecting, setConnecting]   = useState(false);
  const [wrongChain, setWrongChain]   = useState(false);

  const loadBalances = useCallback(async (address, provider) => {
    try {
      const token = new ethers.Contract(CONFIG.PLOT_TOKEN_ADDRESS, ERC20_ABI, provider);
      setPlotBalance(await token.balanceOf(address));
    } catch (e) {
      console.error("plotBalance error:", e);
      setPlotBalance(0n);
    }
    try {
      const game = new ethers.Contract(CONFIG.GAME_CONTRACT_ADDRESS, GAME_ABI, provider);
      // Always fetch from contract — source of truth
      const bal = await game.getGameBalance(address);
      setGameBalance(bal);
    } catch (e) {
      console.error("gameBalance error:", e);
      setGameBalance(0n);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return null;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CONFIG.BASE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CONFIG.BASE_CHAIN_ID.toString(16)}` }],
          });
        } catch {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${CONFIG.BASE_CHAIN_ID.toString(16)}`,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        }
      }

      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const w       = { address, provider, signer };
      setWallet(w);
      setWrongChain(false);
      // Fetch real balances from contract immediately
      await loadBalances(address, provider);
      return w;
    } catch (e) {
      console.error("Connect error:", e);
      return null;
    } finally {
      setConnecting(false);
    }
  }, [loadBalances]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setPlotBalance(0n);
    setGameBalance(0n);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    await loadBalances(wallet.address, wallet.provider);
  }, [wallet, loadBalances]);

  // Called after harvest — adds to local state optimistically
  // Real value confirmed on next refreshBalances()
  const addGameBalance = useCallback((amount) => {
    setGameBalance(prev => prev + amount);
  }, []);

  return {
    wallet, plotBalance, gameBalance,
    connecting, wrongChain,
    connect, disconnect, refreshBalances, addGameBalance,
  };
}
