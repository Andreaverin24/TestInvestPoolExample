import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const root = process.cwd();
const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  throw new Error("Set RPC_URL and PRIVATE_KEY before running npm run deploy.");
}

function readArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "artifacts", `${name}.json`), "utf8"));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from ${wallet.address}`);

  const strategyArtifact = readArtifact("MockEthStrategy");
  const strategyFactory = new ethers.ContractFactory(
    strategyArtifact.abi,
    strategyArtifact.bytecode,
    wallet
  );
  const strategy = await strategyFactory.deploy();
  await strategy.waitForDeployment();

  const strategyAddress = await strategy.getAddress();
  console.log(`MockEthStrategy: ${strategyAddress}`);

  const poolArtifact = readArtifact("EthInvestmentPool");
  const poolFactory = new ethers.ContractFactory(poolArtifact.abi, poolArtifact.bytecode, wallet);
  const pool = await poolFactory.deploy(strategyAddress);
  await pool.waitForDeployment();

  const poolAddress = await pool.getAddress();
  console.log(`EthInvestmentPool: ${poolAddress}`);

  const setPoolTx = await strategy.setPool(poolAddress);
  await setPoolTx.wait();
  console.log("Strategy pool linked.");

  console.log(JSON.stringify({ poolAddress, strategyAddress }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
