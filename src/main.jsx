import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  BLOCK_EXPLORER,
  CHAIN_ID,
  CHAIN_ID_HEX,
  CHAIN_NAME,
  POOL_ABI,
  POOL_ADDRESS,
  PUBLIC_RPC_URL,
  STRATEGY_ABI,
  STRATEGY_ADDRESS
} from "./contracts";
import "./styles.css";

const readProvider = new ethers.JsonRpcProvider(PUBLIC_RPC_URL, CHAIN_ID);

function shortAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatEth(value, digits = 6) {
  if (value === null || value === undefined) return "0";
  const formatted = ethers.formatEther(value);
  const [integer, fraction = ""] = formatted.split(".");
  const trimmed = fraction.slice(0, digits).replace(/0+$/, "");
  return trimmed ? `${integer}.${trimmed}` : integer;
}

function parseEthInput(value) {
  const normalized = value.trim();
  if (!normalized || Number(normalized) <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }
  return ethers.parseEther(normalized);
}

function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [depositAmount, setDepositAmount] = useState("0.01");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [profitAmount, setProfitAmount] = useState("0.01");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState({
    totalHoldings: 0n,
    totalDeposited: 0n,
    totalWithdrawn: 0n,
    totalSupply: 0n,
    lpPrice: ethers.parseEther("1"),
    investorsCount: 0n,
    owner: "",
    strategy: STRATEGY_ADDRESS
  });
  const [strategy, setStrategy] = useState({
    owner: "",
    realBalance: 0n,
    simulatedProfit: 0n
  });
  const [investor, setInvestor] = useState({
    lpTokenBalance: 0n,
    assetsValue: 0n,
    deposited: 0n,
    withdrawn: 0n,
    exists: false
  });
  const [walletBalance, setWalletBalance] = useState(0n);
  const [previews, setPreviews] = useState({
    depositShares: 0n,
    redeemAssets: 0n
  });

  const walletReady = typeof window !== "undefined" && Boolean(window.ethereum);
  const isSepolia = chainId === CHAIN_ID;
  const isOwner = account && strategy.owner && account.toLowerCase() === strategy.owner.toLowerCase();

  const readContracts = useMemo(
    () => ({
      pool: new ethers.Contract(POOL_ADDRESS, POOL_ABI, readProvider),
      strategy: new ethers.Contract(STRATEGY_ADDRESS, STRATEGY_ABI, readProvider)
    }),
    []
  );

  const refresh = useCallback(async () => {
    setError("");
    const [poolState, strategyState] = await Promise.all([
      Promise.all([
        readContracts.pool.totalHoldings(),
        readContracts.pool.totalDeposited(),
        readContracts.pool.totalWithdrawn(),
        readContracts.pool.totalSupply(),
        readContracts.pool.lpPrice(),
        readContracts.pool.investorsCount(),
        readContracts.pool.owner(),
        readContracts.pool.strategy()
      ]),
      Promise.all([
        readContracts.strategy.owner(),
        readContracts.strategy.realBalance(),
        readContracts.strategy.simulatedProfit()
      ])
    ]);

    setPool({
      totalHoldings: poolState[0],
      totalDeposited: poolState[1],
      totalWithdrawn: poolState[2],
      totalSupply: poolState[3],
      lpPrice: poolState[4],
      investorsCount: poolState[5],
      owner: poolState[6],
      strategy: poolState[7]
    });
    setStrategy({
      owner: strategyState[0],
      realBalance: strategyState[1],
      simulatedProfit: strategyState[2]
    });

    if (account) {
      const [info, balance] = await Promise.all([
        readContracts.pool.getInvestor(account),
        readProvider.getBalance(account)
      ]);
      setInvestor({
        lpTokenBalance: info.lpTokenBalance,
        assetsValue: info.assetsValue,
        deposited: info.deposited,
        withdrawn: info.withdrawn,
        firstDepositAt: info.firstDepositAt,
        lastActionAt: info.lastActionAt,
        exists: info.exists
      });
      setWalletBalance(balance);
    } else {
      setWalletBalance(0n);
    }
  }, [account, readContracts]);

  useEffect(() => {
    refresh().catch((err) => setError(err.shortMessage ?? err.message));
  }, [refresh]);

  useEffect(() => {
    if (!walletReady) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => setAccount(accounts[0] ?? ""))
      .catch(() => {});
    window.ethereum
      .request({ method: "eth_chainId" })
      .then((id) => setChainId(Number(id)))
      .catch(() => {});

    const onAccounts = (accounts) => setAccount(accounts[0] ?? "");
    const onChain = (id) => setChainId(Number(id));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, [walletReady]);

  useEffect(() => {
    const run = async () => {
      try {
        const depositValue = parseEthInput(depositAmount);
        const depositShares = await readContracts.pool.previewDeposit(depositValue);

        let redeemAssets = 0n;
        if (withdrawShares.trim() && Number(withdrawShares) > 0) {
          redeemAssets = await readContracts.pool.previewRedeem(ethers.parseEther(withdrawShares));
        }

        setPreviews({ depositShares, redeemAssets });
      } catch {
        setPreviews((current) => ({ ...current, depositShares: 0n }));
      }
    };

    run();
  }, [depositAmount, withdrawShares, readContracts]);

  async function connectWallet() {
    setError("");
    if (!walletReady) {
      setError("MetaMask or another injected wallet is required.");
      return;
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0] ?? "");
    const id = await window.ethereum.request({ method: "eth_chainId" });
    setChainId(Number(id));
  }

  async function switchNetwork() {
    setError("");
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_ID_HEX,
          chainName: CHAIN_NAME,
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [PUBLIC_RPC_URL],
          blockExplorerUrls: [BLOCK_EXPLORER]
        }
      ]
    });
  }

  async function getWriteContracts() {
    if (!walletReady) throw new Error("Wallet is not available.");
    if (!account) await connectWallet();
    if (!isSepolia) await switchNetwork();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return {
      pool: new ethers.Contract(POOL_ADDRESS, POOL_ABI, signer),
      strategy: new ethers.Contract(STRATEGY_ADDRESS, STRATEGY_ABI, signer)
    };
  }

  async function runTransaction(label, callback) {
    setLoading(true);
    setError("");
    setStatus(`${label}: waiting for wallet confirmation`);

    try {
      const tx = await callback(await getWriteContracts());
      setStatus(`${label}: submitted ${shortAddress(tx.hash)}`);
      await tx.wait();
      setStatus(`${label}: confirmed`);
      await refresh();
    } catch (err) {
      setError(err.shortMessage ?? err.reason ?? err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  function handleDeposit() {
    runTransaction("Deposit", ({ pool: writePool }) =>
      writePool.deposit({ value: parseEthInput(depositAmount) })
    );
  }

  function handleWithdraw() {
    runTransaction("Withdraw", ({ pool: writePool }) =>
      writePool.withdraw(parseEthInput(withdrawShares))
    );
  }

  function handleWithdrawAll() {
    runTransaction("Withdraw all", ({ pool: writePool }) => writePool.withdrawAll());
  }

  function handleSimulateProfit() {
    runTransaction("Simulate profit", ({ strategy: writeStrategy }) =>
      writeStrategy.simulateProfit(parseEthInput(profitAmount))
    );
  }

  const realBalanceWarning =
    pool.totalHoldings > strategy.realBalance
      ? "Simulated profit is virtual. Withdrawals above the strategy real balance can revert."
      : "";

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Sepolia assessment</p>
          <h1>ETH Investment Pool</h1>
        </div>
        <div className="wallet">
          <span className={isSepolia ? "network ok" : "network"}>{isSepolia ? CHAIN_NAME : "Wrong network"}</span>
          <button type="button" onClick={account ? switchNetwork : connectWallet}>
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Pool metrics">
        <Metric label="Total holdings" value={`${formatEth(pool.totalHoldings)} ETH`} />
        <Metric label="Total deposited" value={`${formatEth(pool.totalDeposited)} ETH`} />
        <Metric label="Total withdrawn" value={`${formatEth(pool.totalWithdrawn)} ETH`} />
        <Metric label="LP price" value={`${formatEth(pool.lpPrice)} ETH`} />
        <Metric label="LP supply" value={formatEth(pool.totalSupply)} />
        <Metric label="Investors" value={pool.investorsCount.toString()} />
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panelTitle">
            <h2>Deposit</h2>
            <span>Mint LP shares</span>
          </div>
          <label>
            <span>ETH amount</span>
            <input
              inputMode="decimal"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              placeholder="0.01"
            />
          </label>
          <div className="quote">
            <span>Estimated LP</span>
            <strong>{formatEth(previews.depositShares)}</strong>
          </div>
          <button type="button" disabled={loading} onClick={handleDeposit}>
            Deposit ETH
          </button>
        </div>

        <div className="panel">
          <div className="panelTitle">
            <h2>Withdraw</h2>
            <span>Burn LP shares</span>
          </div>
          <label>
            <span>LP amount</span>
            <input
              inputMode="decimal"
              value={withdrawShares}
              onChange={(event) => setWithdrawShares(event.target.value)}
              placeholder={formatEth(investor.lpTokenBalance)}
            />
          </label>
          <div className="quote">
            <span>Estimated ETH</span>
            <strong>{formatEth(previews.redeemAssets)}</strong>
          </div>
          <div className="buttonRow">
            <button type="button" disabled={loading || investor.lpTokenBalance === 0n} onClick={handleWithdraw}>
              Withdraw
            </button>
            <button
              type="button"
              className="secondary"
              disabled={loading || investor.lpTokenBalance === 0n}
              onClick={handleWithdrawAll}
            >
              Withdraw all
            </button>
          </div>
        </div>
      </section>

      <section className="details">
        <div className="panel">
          <div className="panelTitle">
            <h2>Your position</h2>
            <span>{shortAddress(account)}</span>
          </div>
          <dl>
            <Row label="Wallet balance" value={`${formatEth(walletBalance)} ETH`} />
            <Row label="LP balance" value={formatEth(investor.lpTokenBalance)} />
            <Row label="ETH value" value={`${formatEth(investor.assetsValue)} ETH`} />
            <Row label="Deposited" value={`${formatEth(investor.deposited)} ETH`} />
            <Row label="Withdrawn" value={`${formatEth(investor.withdrawn)} ETH`} />
          </dl>
        </div>

        <div className="panel">
          <div className="panelTitle">
            <h2>Return simulation</h2>
            <span>{isOwner ? "Owner wallet" : "Read only"}</span>
          </div>
          <dl>
            <Row label="Strategy balance" value={`${formatEth(strategy.realBalance)} ETH`} />
            <Row label="Simulated profit" value={`${formatEth(strategy.simulatedProfit)} ETH`} />
          </dl>
          <label>
            <span>Profit amount</span>
            <input
              inputMode="decimal"
              value={profitAmount}
              onChange={(event) => setProfitAmount(event.target.value)}
              placeholder="0.01"
            />
          </label>
          <button type="button" disabled={loading || !isOwner} onClick={handleSimulateProfit}>
            Simulate returns
          </button>
          {realBalanceWarning && <p className="warning">{realBalanceWarning}</p>}
        </div>
      </section>

      <section className="contractLinks" aria-label="Contract links">
        <a href={`${BLOCK_EXPLORER}/address/${POOL_ADDRESS}#readContract`} target="_blank" rel="noreferrer">
          Pool contract
        </a>
        <a href={`${BLOCK_EXPLORER}/address/${STRATEGY_ADDRESS}#readContract`} target="_blank" rel="noreferrer">
          Strategy contract
        </a>
        <button type="button" className="secondary" onClick={refresh}>
          Refresh
        </button>
      </section>

      {(status || error) && (
        <aside className={error ? "toast error" : "toast"}>
          {error || status}
        </aside>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
