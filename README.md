# ETH Investment Pool Assessment

React + Solidity assessment project for an ETH investment pool on Sepolia.

## Deployed contracts

- EthInvestmentPool: `0x02f8e06c1f12ce253652bc12a75339c75f83cce5`
- MockEthStrategy: `0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada`
- Network: Sepolia
- Public RPC used by the frontend: `https://ethereum-sepolia.publicnode.com`

## Features

- Connect an injected wallet such as MetaMask.
- Deposit Sepolia ETH into the pool and receive LP shares.
- Withdraw by burning a chosen LP share amount.
- Withdraw the full LP balance.
- Read pool totals, investor accounting, LP price, strategy balance, and simulated profit through a public RPC endpoint.
- Owner-only return simulation through `MockEthStrategy.simulateProfit`.

## Local setup

```bash
npm install
cp .env.example .env
npm run compile
npm run dev
```

Open the Vite URL and connect a Sepolia wallet.

## Scripts

Compile contracts and export ABI files:

```bash
npm run compile
```

Deploy a new strategy and pool:

```bash
RPC_URL=https://ethereum-sepolia.publicnode.com PRIVATE_KEY=0x... npm run deploy
```

Read deployed contract state:

```bash
RPC_URL=https://ethereum-sepolia.publicnode.com POOL_ADDRESS=0x02f8e06c1f12ce253652bc12a75339c75f83cce5 STRATEGY_ADDRESS=0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada npm run interact status
```

Write examples:

```bash
RPC_URL=https://ethereum-sepolia.publicnode.com PRIVATE_KEY=0x... POOL_ADDRESS=0x02f8e06c1f12ce253652bc12a75339c75f83cce5 STRATEGY_ADDRESS=0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada npm run interact deposit 0.01
RPC_URL=https://ethereum-sepolia.publicnode.com PRIVATE_KEY=0x... POOL_ADDRESS=0x02f8e06c1f12ce253652bc12a75339c75f83cce5 STRATEGY_ADDRESS=0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada npm run interact withdrawAll
RPC_URL=https://ethereum-sepolia.publicnode.com PRIVATE_KEY=0x... POOL_ADDRESS=0x02f8e06c1f12ce253652bc12a75339c75f83cce5 STRATEGY_ADDRESS=0xb8db66ccfc2e6bbf9426215e1373c5280a3aeada npm run interact simulateProfit 0.01
```

## ABI deliverables

After `npm run compile`, ABI files are written to:

- `src/abi/EthInvestmentPool.json`
- `src/abi/MockEthStrategy.json`

The frontend uses compact ABI fragments in `src/contracts.js`; the generated ABI files are included for submission.
