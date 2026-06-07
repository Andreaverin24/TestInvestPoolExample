// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/**
 * @title  MockEthStrategy
 * @notice Mock ETH strategy for Sepolia assessment/demo.
 *
 * Important model:
 * - The strategy receives real ETH deposits from the pool.
 * - simulateProfit(uint256 amount) only increases virtual/accounting profit.
 * - totalHoldings() returns real ETH balance + virtual simulated profit.
 *
 * This allows the pool to demonstrate LP-share issuance based on totalHoldings.
 *
 * Example:
 * - Pool deposits 1 ETH into strategy.
 * - totalHoldings = 1 ETH.
 * - Owner calls simulateProfit(1 ETH).
 * - totalHoldings = 2 ETH.
 * - Next deposit mints fewer LP shares because LP price increased.
 *
 * This is not a real yield strategy.
 * It is only a controlled mock strategy for testing accounting logic.
 */
contract MockEthStrategy {
    address public owner;
    address public pool;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    /**
     * @notice Virtual profit used only for accounting demonstration.
     * @dev    It is not backed by actual ETH unless the strategy is funded separately.
     */
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

    /**
     * @notice Receive ETH deposit from pool.
     */
    function deposit() external payable onlyPool {
        if (msg.value == 0) revert ZeroAmount();

        totalDeposited += msg.value;

        emit DepositedFromPool(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw real ETH to receiver.
     * @dev If simulatedProfit is not backed by real ETH, large withdrawals may fail.
     */
    function withdraw(uint256 amount, address receiver) external onlyPool {
        if (amount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert InvalidAddress();
        if (address(this).balance < amount) revert InsufficientBalance();

        totalWithdrawn += amount;

        (bool success, ) = payable(receiver).call{value: amount}("");
        if (!success) revert EthTransferFailed();

        emit WithdrawnToReceiver(receiver, amount);
    }

    /**
     * @notice Simulate strategy profit by increasing accounting profit.
     * @param amount Amount of virtual profit to add.
     *
     * Example:
     * simulateProfit(1 ether) increases totalHoldings() by 1 ETH.
     */
    function simulateProfit(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();

        simulatedProfit += amount;

        emit ProfitSimulated(msg.sender, amount, simulatedProfit);
    }

    /**
     * @notice Total strategy assets used by the pool for LP-share accounting.
     *
     * For this mock:
     * totalHoldings = real ETH balance + virtual simulated profit.
     */
    function totalHoldings() external view returns (uint256) {
        return address(this).balance + simulatedProfit;
    }

    /**
     * @notice Real ETH balance held by strategy.
     */
    function realBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Allows funding the strategy with real ETH if needed for withdrawal demos.
     * @dev This does not increase simulatedProfit because balance already affects totalHoldings().
     */
    receive() external payable {}
}
