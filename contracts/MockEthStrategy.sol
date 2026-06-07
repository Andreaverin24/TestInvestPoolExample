// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEthStrategy
 * @notice Mock ETH strategy for assessment/demo deployments.
 *
 * The strategy receives real ETH deposits from the pool. `simulateProfit`
 * increases accounting profit so the UI can demonstrate return distribution.
 * Large withdrawals require the strategy to hold enough real ETH.
 */
contract MockEthStrategy {
    address public owner;
    address public pool;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    uint256 public simulatedProfit;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PoolUpdated(address indexed oldPool, address indexed newPool);
    event DepositedFromPool(address indexed pool, uint256 amount);
    event WithdrawnToReceiver(address indexed receiver, uint256 amount);
    event ProfitSimulated(address indexed operator, uint256 addedProfit, uint256 totalSimulatedProfit);

    error NotOwner();
    error NotPool();
    error InvalidAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error EthTransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert NotPool();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function setPool(address newPool) external onlyOwner {
        if (newPool == address(0)) revert InvalidAddress();

        address oldPool = pool;
        pool = newPool;

        emit PoolUpdated(oldPool, newPool);
    }

    function deposit() external payable onlyPool {
        if (msg.value == 0) revert ZeroAmount();

        totalDeposited += msg.value;

        emit DepositedFromPool(msg.sender, msg.value);
    }

    function withdraw(uint256 amount, address receiver) external onlyPool {
        if (amount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert InvalidAddress();
        if (address(this).balance < amount) revert InsufficientBalance();

        totalWithdrawn += amount;

        (bool success, ) = payable(receiver).call{value: amount}("");
        if (!success) revert EthTransferFailed();

        emit WithdrawnToReceiver(receiver, amount);
    }

    function simulateProfit(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();

        simulatedProfit += amount;

        emit ProfitSimulated(msg.sender, amount, simulatedProfit);
    }

    function totalHoldings() external view returns (uint256) {
        return address(this).balance + simulatedProfit;
    }

    function realBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    receive() external payable {}
}
