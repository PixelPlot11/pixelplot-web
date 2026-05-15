// src/lib/config.js

export const CONFIG = {
  PLOT_TOKEN_ADDRESS:    import.meta.env.VITE_PLOT_TOKEN_ADDRESS,
  GAME_CONTRACT_ADDRESS: import.meta.env.VITE_GAME_CONTRACT_ADDRESS,
  BASE_RPC:              import.meta.env.VITE_BASE_RPC    || "https://sepolia.base.org",
  BASE_CHAIN_ID:         Number(import.meta.env.VITE_BASE_CHAIN_ID) || 84532,
  ALCHEMY_KEY:           import.meta.env.VITE_ALCHEMY_KEY || "",
  BACKEND_URL:           import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
};

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export const GAME_ABI = [
  "function buySeed(uint8 cropId, uint256 quantity, uint256 amount, uint256 nonce, bytes calldata signature) external",
  "function addEarnings(address user, uint256 amount, uint256 nonce, bytes calldata signature) external",
  "function withdraw(uint256 amount) external",
  "function getGameBalance(address user) view returns (uint256)",
  "function getSeedInventory(address user, uint8 cropId) view returns (uint256)",
  "function getAllSeeds(address user) view returns (uint256[8])",
  "function withdrawCooldownRemaining(address user) view returns (uint256)",
  "function nonces(address user) view returns (uint256)",
  "function purchaseNonces(address user) view returns (uint256)",
  "function cropActive(uint8 cropId) view returns (bool)",
];
