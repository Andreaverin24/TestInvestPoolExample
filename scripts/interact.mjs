import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const root = process.cwd();
const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const poolAddress = process.env.POOL_ADDRESS ?? process.env.VITE_POOL_ADDRESS;
const strategyAddress = process.env.STRATEGY_ADDRESS ?? process.env.VITE_STRATEGY_ADDRESS;
const command = process.argv[2] ?? "status";
const amount = process.argv[3];

if (!rpcUrl) {
  throw new Error("Set RPC_URL before running npm run interact.");
}
if (!poolAddress || !strategyAddress) {
  throw new Error("Set POOL_ADDRESS and STRATEGY_ADDRESS.");
}

const poolAbi = JSON.parse(fs.readFileSync(path.join(root, "src", "abi", "EthInvestmentPool.json"), "utf8"));
const strategyAbi = JSON.parse(fs.readFileSync(path.join(root, "src", "abi", "MockEthStrategy.json"), "utf8"));

function formatEth(value) {
  return ethers.formatEther(value);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = privateKey ? new ethers.Wallet(privateKey, provider) : null;
  const pool = new ethers.Contract(poolAddress, poolAbi, signer ?? provider);
  const strategy = new ethers.Contract(strategyAddress, strategyAbi, signer ?? provider);

  if (command === "status") {
    const [totalHoldings, totalDeposited, totalWithdrawn, totalSupply, lpPrice, investorsCount, realBalance, simulatedProfit] =
      await Promise.all([
        pool.totalHoldings(),
        pool.totalDeposited(),
        pool.totalWithdrawn(),
        pool.totalSupply(),
        pool.lpPrice(),
        pool.investorsCount(),
        strategy.realBalance(),
        strategy.simulatedProfit()
      ]);

    console.log({
      poolAddress,
      strategyAddress,
      totalHoldingsEth: formatEth(totalHoldings),
      totalDepositedEth: formatEth(totalDeposited),
      totalWithdrawnEth: formatEth(totalWithdrawn),
      totalSupplyLp: formatEth(totalSupply),
      lpPriceEth: formatEth(lpPrice),
      investorsCount: investorsCount.toString(),
      strategyRealBalanceEth: formatEth(realBalance),
      strategySimulatedProfitEth: formatEth(simulatedProfit)
    });
    return;
  }

  if (!signer) {
    throw new Error("PRIVATE_KEY is required for write commands.");
  }

  if (command === "deposit") {
    const tx = await pool.deposit({ value: ethers.parseEther(amount) });
    console.log(`Deposit tx: ${tx.hash}`);
    await tx.wait();
    return;
  }

  if (command === "withdraw") {
    const tx = await pool.withdraw(ethers.parseEther(amount));
    console.log(`Withdraw tx: ${tx.hash}`);
    await tx.wait();
    return;
  }

  if (command === "withdrawAll") {
    const tx = await pool.withdrawAll();
    console.log(`Withdraw all tx: ${tx.hash}`);
    await tx.wait();
    return;
  }

  if (command === "simulateProfit") {
    const tx = await strategy.simulateProfit(ethers.parseEther(amount));
    console.log(`Simulate profit tx: ${tx.hash}`);
    await tx.wait();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
