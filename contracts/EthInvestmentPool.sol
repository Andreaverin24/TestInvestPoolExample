// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IEthStrategy {
    function deposit() external payable;
    function withdraw(uint256 amount, address receiver) external;
    function totalHoldings() external view returns (uint256);
}

/**
 * @title EthInvestmentPool
 * @notice ERC20 LP-token based ETH investment pool for assessment/demo use.
 *
 * Users deposit ETH and receive LP tokens. Returns are simulated in the strategy:
 * when strategy holdings grow, each LP token represents more ETH.
 */
contract EthInvestmentPool is ERC20 {
    uint256 public constant PRECISION = 1e18;

    address public owner;
    IEthStrategy public strategy;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    uint256 private locked;

    struct Investor {
        uint256 deposited;
        uint256 withdrawn;
        uint256 firstDepositAt;
        uint256 lastActionAt;
        bool exists;
    }

    mapping(address => Investor) private investors;
    address[] private investorList;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event StrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event Deposited(
        address indexed investor,
        uint256 assets,
        uint256 mintedShares,
        uint256 lpPriceAfter,
        uint256 totalHoldingsAfter,
        uint256 totalSupplyAfter
    );
    event Withdrawn(
        address indexed investor,
        uint256 assets,
        uint256 burnedShares,
        uint256 lpPriceAfter,
        uint256 totalHoldingsAfter,
        uint256 totalSupplyAfter
    );

    error NotOwner();
    error ZeroAmount();
    error InvalidAddress();
    error InvalidState();
    error EthTransferRejected();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        require(locked == 0, "REENTRANCY");
        locked = 1;
        _;
        locked = 0;
    }

    constructor(address strategyAddress) ERC20("Test ETH InvPool LP", "TeETH-LP") {
        if (strategyAddress == address(0)) revert InvalidAddress();

        owner = msg.sender;
        strategy = IEthStrategy(strategyAddress);

        emit OwnershipTransferred(address(0), msg.sender);
        emit StrategyUpdated(address(0), strategyAddress);
    }

    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        uint256 assets = msg.value;
        uint256 holdingsBefore = totalHoldings();
        uint256 mintedShares = _previewDepositWithHoldings(assets, holdingsBefore);

        Investor storage investor = investors[msg.sender];

        if (!investor.exists) {
            investor.exists = true;
            investor.firstDepositAt = block.timestamp;
            investorList.push(msg.sender);
        }

        investor.deposited += assets;
        investor.lastActionAt = block.timestamp;
        totalDeposited += assets;

        _mint(msg.sender, mintedShares);
        strategy.deposit{value: assets}();

        emit Deposited(msg.sender, assets, mintedShares, lpPrice(), totalHoldings(), totalSupply());
    }

    function withdraw(uint256 shares) external nonReentrant {
        if (shares == 0) revert ZeroAmount();

        uint256 assets = previewRedeem(shares);
        Investor storage investor = investors[msg.sender];

        investor.withdrawn += assets;
        investor.lastActionAt = block.timestamp;
        totalWithdrawn += assets;

        _burn(msg.sender, shares);
        strategy.withdraw(assets, msg.sender);

        emit Withdrawn(msg.sender, assets, shares, lpPrice(), totalHoldings(), totalSupply());
    }

    function withdrawAll() external nonReentrant {
        uint256 shares = balanceOf(msg.sender);
        if (shares == 0) revert ZeroAmount();

        uint256 assets = previewRedeem(shares);
        Investor storage investor = investors[msg.sender];

        investor.withdrawn += assets;
        investor.lastActionAt = block.timestamp;
        totalWithdrawn += assets;

        _burn(msg.sender, shares);
        strategy.withdraw(assets, msg.sender);

        emit Withdrawn(msg.sender, assets, shares, lpPrice(), totalHoldings(), totalSupply());
    }

    function previewDeposit(uint256 assets) public view returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();

        return _previewDepositWithHoldings(assets, totalHoldings());
    }

    function previewRedeem(uint256 shares) public view returns (uint256 assets) {
        if (shares == 0) revert ZeroAmount();

        uint256 supply = totalSupply();
        if (supply == 0) revert InvalidState();

        return (shares * totalHoldings()) / supply;
    }

    function totalHoldings() public view returns (uint256) {
        return strategy.totalHoldings();
    }

    function lpPrice() public view returns (uint256) {
        uint256 supply = totalSupply();

        if (supply == 0) {
            return PRECISION;
        }

        return (totalHoldings() * PRECISION) / supply;
    }

    function balanceOfAssets(address investorAddress) public view returns (uint256) {
        uint256 shares = balanceOf(investorAddress);
        uint256 supply = totalSupply();

        if (shares == 0 || supply == 0) {
            return 0;
        }

        return (shares * totalHoldings()) / supply;
    }

    function getInvestor(address investorAddress)
        external
        view
        returns (
            uint256 lpTokenBalance,
            uint256 assetsValue,
            uint256 deposited,
            uint256 withdrawn,
            uint256 firstDepositAt,
            uint256 lastActionAt,
            bool exists
        )
    {
        Investor storage investor = investors[investorAddress];

        return (
            balanceOf(investorAddress),
            balanceOfAssets(investorAddress),
            investor.deposited,
            investor.withdrawn,
            investor.firstDepositAt,
            investor.lastActionAt,
            investor.exists
        );
    }

    function investorsCount() external view returns (uint256) {
        return investorList.length;
    }

    function getInvestorAt(uint256 index) external view returns (address) {
        return investorList[index];
    }

    function setStrategy(address newStrategy) external onlyOwner {
        if (newStrategy == address(0)) revert InvalidAddress();

        address oldStrategy = address(strategy);
        strategy = IEthStrategy(newStrategy);

        emit StrategyUpdated(oldStrategy, newStrategy);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function _previewDepositWithHoldings(uint256 assets, uint256 holdings)
        internal
        view
        returns (uint256 shares)
    {
        if (assets == 0) revert ZeroAmount();

        uint256 supply = totalSupply();

        if (supply == 0) {
            return assets;
        }

        if (holdings == 0) revert InvalidState();

        return (assets * supply) / holdings;
    }

    receive() external payable {
        revert EthTransferRejected();
    }

    fallback() external payable {
        revert EthTransferRejected();
    }
}
