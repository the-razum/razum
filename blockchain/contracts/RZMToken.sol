// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RZM Token - Razum AI Network Token
 * @dev ERC-20 with burn mechanism, miner rewards, and safety features
 *
 * Tokenomics:
 * - Total supply: 1,000,000,000 RZM
 * - Miner rewards: 50% (500M) - distributed over ~10 years with halving
 * - Team & development: 15% (150M) - 2-year vesting
 * - Community & ecosystem: 15% (150M)
 * - Early investors: 10% (100M) - 1-year vesting
 * - Liquidity: 10% (100M)
 *
 * Features:
 * - 1% transfer fee (20% burned, 80% to treasury)
 * - Halving every ~4 years (modeled after Gonka's epoch decay)
 * - Pausable for emergencies
 * - ReentrancyGuard on reward distribution
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RZMToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    // ═══════════════════ MINER REWARDS ═══════════════════
    uint256 public totalMinerRewards;
    uint256 public constant MAX_MINER_REWARDS = 500_000_000 * 10**18;

    // Epoch-based rewards (inspired by Gonka)
    uint256 public constant INITIAL_EPOCH_REWARD = 323_000 * 10**18; // 323K RZM per epoch
    uint256 public constant EPOCH_DURATION = 7 days;
    uint256 public constant HALVING_INTERVAL = 208 weeks; // ~4 years
    uint256 public epochStartTime;
    uint256 public currentEpoch;
    uint256 public epochRewardsDistributed;

    // ═══════════════════ BURN & FEES ═══════════════════
    uint256 public totalBurned;
    uint256 public transferFeePercent = 1;  // 1%
    uint256 public burnRatePercent = 20;    // 20% of fee

    // ═══════════════════ ACCESS CONTROL ═══════════════════
    mapping(address => bool) public feeExempt;
    mapping(address => bool) public rewardDistributors;

    // ═══════════════════ COLLATERAL (simplified) ═══════════════════
    mapping(address => uint256) public minerCollateral;
    uint256 public minCollateral = 1000 * 10**18; // 1000 RZM minimum stake
    uint256 public totalCollateral;

    // ═══════════════════ EVENTS ═══════════════════
    event MinerRewarded(address indexed miner, uint256 amount, string taskId);
    event FeeCollected(uint256 fee, uint256 burned);
    event DistributorUpdated(address indexed distributor, bool status);
    event CollateralDeposited(address indexed miner, uint256 amount);
    event CollateralWithdrawn(address indexed miner, uint256 amount);
    event CollateralSlashed(address indexed miner, uint256 amount, string reason);
    event EpochAdvanced(uint256 epoch, uint256 maxReward);

    constructor() ERC20("Razum AI Token", "RZM") Ownable(msg.sender) {
        uint256 total = 1_000_000_000 * 10**18;
        _mint(msg.sender, total);

        feeExempt[msg.sender] = true;
        feeExempt[address(this)] = true;

        epochStartTime = block.timestamp;
        currentEpoch = 0;
    }

    // ═══════════════════ MINER REWARDS ═══════════════════

    /**
     * @dev Reward a miner for completing a compute task
     * Includes epoch-based decay and halving
     */
    function rewardMiner(
        address miner,
        uint256 amount,
        string calldata taskId
    ) external nonReentrant whenNotPaused {
        require(miner != address(0), "Invalid miner address");
        require(rewardDistributors[msg.sender], "Not authorized distributor");
        require(totalMinerRewards + amount <= MAX_MINER_REWARDS, "Reward cap reached");

        // Advance epoch if needed
        _advanceEpoch();

        // Check epoch reward limit
        uint256 epochMax = currentEpochReward();
        require(epochRewardsDistributed + amount <= epochMax, "Epoch reward limit reached");

        require(balanceOf(owner()) >= amount, "Insufficient reward pool");

        totalMinerRewards += amount;
        epochRewardsDistributed += amount;
        _transfer(owner(), miner, amount);

        emit MinerRewarded(miner, amount, taskId);
    }

    /**
     * @dev Get the maximum reward for the current epoch (with halving)
     */
    function currentEpochReward() public view returns (uint256) {
        uint256 halvings = (block.timestamp - epochStartTime) / HALVING_INTERVAL;
        if (halvings >= 64) return 0; // practically zero after 64 halvings
        return INITIAL_EPOCH_REWARD >> halvings; // divide by 2^halvings
    }

    function _advanceEpoch() internal {
        uint256 elapsed = block.timestamp - epochStartTime;
        uint256 newEpoch = elapsed / EPOCH_DURATION;
        if (newEpoch > currentEpoch) {
            currentEpoch = newEpoch;
            epochRewardsDistributed = 0;
            emit EpochAdvanced(currentEpoch, currentEpochReward());
        }
    }

    // ═══════════════════ COLLATERAL (STAKING) ═══════════════════

    /**
     * @dev Miner deposits RZM as collateral to join the network
     */
    function depositCollateral(uint256 amount) external whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _transfer(msg.sender, address(this), amount);
        minerCollateral[msg.sender] += amount;
        totalCollateral += amount;

        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @dev Miner withdraws collateral (7-day cooldown in production)
     */
    function withdrawCollateral(uint256 amount) external nonReentrant whenNotPaused {
        require(minerCollateral[msg.sender] >= amount, "Insufficient collateral");
        // After withdrawal, must still have >= minCollateral or withdraw all
        uint256 remaining = minerCollateral[msg.sender] - amount;
        require(remaining == 0 || remaining >= minCollateral, "Must keep minimum collateral or withdraw all");

        minerCollateral[msg.sender] -= amount;
        totalCollateral -= amount;
        _transfer(address(this), msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Slash a miner's collateral for bad behavior
     * Can only be called by authorized distributors
     */
    function slashCollateral(
        address miner,
        uint256 amount,
        string calldata reason
    ) external nonReentrant {
        require(rewardDistributors[msg.sender], "Not authorized");
        require(minerCollateral[miner] >= amount, "Not enough collateral");

        minerCollateral[miner] -= amount;
        totalCollateral -= amount;

        // Slashed tokens are burned
        _burn(address(this), amount);
        totalBurned += amount;

        emit CollateralSlashed(miner, amount, reason);
    }

    /**
     * @dev Check if a miner has sufficient collateral
     */
    function hasMinCollateral(address miner) external view returns (bool) {
        return minerCollateral[miner] >= minCollateral;
    }

    // ═══════════════════ TRANSFER FEE + BURN ═══════════════════

    function _update(address from, address to, uint256 value) internal virtual override whenNotPaused {
        if (from != address(0) && to != address(0) && !feeExempt[from] && !feeExempt[to]) {
            uint256 fee = (value * transferFeePercent) / 100;
            uint256 burnAmount = (fee * burnRatePercent) / 100;
            uint256 remaining = fee - burnAmount;

            if (burnAmount > 0) {
                super._update(from, address(0), burnAmount);
                totalBurned += burnAmount;
            }
            if (remaining > 0) {
                super._update(from, owner(), remaining);
            }

            emit FeeCollected(fee, burnAmount);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }

    // ═══════════════════ ADMIN ═══════════════════

    function setFeeExempt(address addr, bool exempt) external onlyOwner {
        feeExempt[addr] = exempt;
    }

    function setDistributor(address addr, bool status) external onlyOwner {
        rewardDistributors[addr] = status;
        emit DistributorUpdated(addr, status);
    }

    function setFees(uint256 _transferFee, uint256 _burnRate) external onlyOwner {
        require(_transferFee <= 5, "Fee too high");
        require(_burnRate <= 100, "Burn rate max 100%");
        transferFeePercent = _transferFee;
        burnRatePercent = _burnRate;
    }

    function setMinCollateral(uint256 amount) external onlyOwner {
        minCollateral = amount;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
