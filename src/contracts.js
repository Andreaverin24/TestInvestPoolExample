export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 11155111);
export const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME ?? "Sepolia";
export const PUBLIC_RPC_URL =
  import.meta.env.VITE_PUBLIC_RPC_URL ?? "https://ethereum-sepolia.publicnode.com";
export const BLOCK_EXPLORER =
  import.meta.env.VITE_BLOCK_EXPLORER ?? "https://sepolia.etherscan.io";
export const POOL_ADDRESS =
  import.meta.env.VITE_POOL_ADDRESS ?? "0x02f8e06c1f12ce253652bc12a75339c75f83cce5";
export const STRATEGY_ADDRESS =
  import.meta.env.VITE_STRATEGY_ADDRESS ?? "0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada";

export const POOL_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 shares)",
  "function withdrawAll()",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function totalHoldings() view returns (uint256)",
  "function lpPrice() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function balanceOfAssets(address investorAddress) view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function totalWithdrawn() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function strategy() view returns (address)",
  "function investorsCount() view returns (uint256)",
  "function getInvestor(address investorAddress) view returns (uint256 lpTokenBalance, uint256 assetsValue, uint256 deposited, uint256 withdrawn, uint256 firstDepositAt, uint256 lastActionAt, bool exists)"
];

export const STRATEGY_ABI = [
  "function owner() view returns (address)",
  "function pool() view returns (address)",
  "function totalDeposited() view returns (uint256)",
  "function totalWithdrawn() view returns (uint256)",
  "function simulatedProfit() view returns (uint256)",
  "function totalHoldings() view returns (uint256)",
  "function realBalance() view returns (uint256)",
  "function simulateProfit(uint256 amount)"
];
