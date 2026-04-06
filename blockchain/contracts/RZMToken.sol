// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RZM Token - Razum AI Network Token
 * @dev ERC-20 token with burn mechanism and miner rewards
 *
 * Tokenomics:
 * - Total supply: 1,000,000,000 RZM
 * - Miner rewards: 50% (500M) - distributed over 10 years
 * - Team & development: 15% (150M) - 2-year vesting
 * - Community & ecosystem: 15% (150M)
 * - Early investors: 10% (100M) - 1-year vesting
 * - Liquidity: 10% (100M)
 *
 * Burn mechanism: 20% of each transaction fee is burned
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RZMToken is ERC20, ERC20Burnable, Ownable {
    // Miner reward pool
    uint256 public minerRewardPool;
    uint256 public totalMinerRewards;
    uint256 public constant MAX_MINER_REWARDS = 500_000_000 * 10**18; // 500M RZM

    // Burn tracking
    uint256 public totalBurned;

    // Fee: 1% of transfers, 20% of fee is burned
    uint256 public transferFeePercent = 1; // 1%
    uint256 public burnRatePercent = 20;   // 20% of fee

    // Fee exempt addresses
    mapping(address => bool) public feeExempt;

    // Authorized miner reward distributors
    mapping(address => bool) public rewardDistributors;

    // Events
    event MinerRewarded(address indexed miner, uint256 amount, string taskId);
    event FeeCollected(uint256 fee, uint256 burned);
    event DistributorUpdated(address indexed distributor, bool status);

    constructor() ERC20("Razum AI Token", "RZM") Ownable(msg.sender) {
        uint256 totalSupply = 1_000_000_000 * 10**18; // 1B tokens

        // Mint total supply to deployer
        _mint(msg.sender, totalSupply);

        // Set aside miner rewards (transferred to contract)
        minerRewardPool = MAX_MINER_REWARDS;

        // Owner is fee exempt
        feeExempt[msg.sender] = true;
        feeExempt[address(this)] = true;
    }

    /**
     * @dev Reward a miner for completing a compute task
     * @param miner Address of the miner
     * @param amount Reward amount in RZM
     * @param taskId Unique task identifier for tracking
     */
    function rewardMiner(address miner, uint256 amount, string calldata taskId) external {
        require(rewardDistributors[msg.sender], "Not authorized distributor");
        require(totalMinerRewards + amount <= MAX_MINER_REWARDS, "Miner reward cap reached");
        require(balanceOf(owner()) >= amount, "Insufficient reward pool");

        totalMinerRewards += amount;
        _transfer(owner(), miner, amount);

        emit MinerRewarded(miner, amount, taskId);
    }

    /**
     * @dev Override transfer to apply fee + burn
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0) && to != address(0) && !feeExempt[from] && !feeExempt[to]) {
            uint256 fee = (value * transferFeePercent) / 100;
            uint256 burnAmount = (fee * burnRatePercent) / 100;
            uint256 remaining = fee - burnAmount;

            // Burn portion
            if (burnAmount > 0) {
                super._update(from, address(0), burnAmount);
                totalBurned += burnAmount;
            }

            // Fee to owner (treasury)
            if (remaining > 0) {
                super._update(from, owner(), remaining);
            }

            emit FeeCollected(fee, burnAmount);

            // Transfer remaining amount
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }

    // --- Admin functions ---

    function setFeeExempt(address addr, bool exempt) external onlyOwner {
        feeExempt[addr] = exempt;
    }

    function setDistributor(address addr, bool status) external onlyOwner {
        rewardDistributors[addr] = status;
        emit DistributorUpdated(addr, status);
    }

    function setFees(uint256 _transferFee, uint256 _burnRate) external onlyOwner {
        require(_transferFee <= 5, "Fee too high"); // max 5%
        require(_burnRate <= 100, "Burn rate max 100%");
        transferFeePercent = _transferFee;
        burnRatePercent = _burnRate;
    }
}
