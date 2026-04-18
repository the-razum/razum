const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RZMToken', function () {
  let token, owner, miner, user1, user2, distributor;

  beforeEach(async function () {
    [owner, miner, user1, user2, distributor] = await ethers.getSigners();
    const RZMToken = await ethers.getContractFactory('RZMToken');
    token = await RZMToken.deploy();
    await token.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should have correct name and symbol', async function () {
      expect(await token.name()).to.equal('Razum AI Token');
      expect(await token.symbol()).to.equal('RZM');
    });

    it('should mint 1B tokens to owner', async function () {
      const supply = await token.totalSupply();
      expect(supply).to.equal(ethers.parseEther('1000000000'));
      expect(await token.balanceOf(owner.address)).to.equal(supply);
    });

    it('should set owner as fee exempt', async function () {
      expect(await token.feeExempt(owner.address)).to.be.true;
    });
  });

  describe('Transfer Fee', function () {
    it('should charge 1% fee on transfers between non-exempt', async function () {
      // Give user1 some tokens
      await token.transfer(user1.address, ethers.parseEther('10000'));
      // user1 -> user2 should have 1% fee
      await token.connect(user1).transfer(user2.address, ethers.parseEther('1000'));
      // user2 should get 990 (1000 - 1% fee)
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther('990'));
    });

    it('should burn 20% of the fee', async function () {
      await token.transfer(user1.address, ethers.parseEther('10000'));
      const burnBefore = await token.totalBurned();
      await token.connect(user1).transfer(user2.address, ethers.parseEther('1000'));
      const burnAfter = await token.totalBurned();
      // 1% of 1000 = 10, 20% of 10 = 2 burned
      expect(burnAfter - burnBefore).to.equal(ethers.parseEther('2'));
    });

    it('should not charge fee for exempt addresses', async function () {
      // Owner is exempt
      await token.transfer(user1.address, ethers.parseEther('1000'));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther('1000'));
    });
  });

  describe('Miner Rewards', function () {
    beforeEach(async function () {
      await token.setDistributor(distributor.address, true);
    });

    it('should reward miner through distributor', async function () {
      const amount = ethers.parseEther('100');
      await token.connect(distributor).rewardMiner(miner.address, amount, 'task-001');
      expect(await token.balanceOf(miner.address)).to.equal(amount);
      expect(await token.totalMinerRewards()).to.equal(amount);
    });

    it('should reject rewards from non-distributors', async function () {
      await expect(
        token.connect(user1).rewardMiner(miner.address, ethers.parseEther('100'), 'task-002')
      ).to.be.revertedWith('Not authorized distributor');
    });

    it('should reject reward to zero address', async function () {
      await expect(
        token.connect(distributor).rewardMiner(ethers.ZeroAddress, ethers.parseEther('100'), 'task-003')
      ).to.be.revertedWith('Invalid miner address');
    });

    it('should enforce max miner rewards cap', async function () {
      const maxRewards = await token.MAX_MINER_REWARDS();
      // Try to reward more than cap (would fail on balance anyway, but cap is checked first)
      await expect(
        token.connect(distributor).rewardMiner(miner.address, maxRewards + 1n, 'task-004')
      ).to.be.reverted;
    });
  });

  describe('Collateral (Staking)', function () {
    const stakeAmount = ethers.parseEther('5000');

    beforeEach(async function () {
      // Give miner some tokens
      await token.transfer(miner.address, ethers.parseEther('10000'));
    });

    it('should allow depositing collateral', async function () {
      await token.connect(miner).depositCollateral(stakeAmount);
      expect(await token.minerCollateral(miner.address)).to.equal(stakeAmount);
      expect(await token.totalCollateral()).to.equal(stakeAmount);
    });

    it('should allow withdrawing collateral', async function () {
      await token.connect(miner).depositCollateral(stakeAmount);
      await token.connect(miner).withdrawCollateral(stakeAmount);
      expect(await token.minerCollateral(miner.address)).to.equal(0);
    });

    it('should enforce minimum collateral on partial withdrawal', async function () {
      await token.connect(miner).depositCollateral(stakeAmount);
      const minCol = await token.minCollateral();
      // Try to withdraw so remaining < minCollateral (but > 0)
      const withdrawAmount = stakeAmount - minCol + 1n;
      await expect(
        token.connect(miner).withdrawCollateral(withdrawAmount)
      ).to.be.revertedWith('Must keep minimum collateral or withdraw all');
    });

    it('should check hasMinCollateral', async function () {
      expect(await token.hasMinCollateral(miner.address)).to.be.false;
      await token.connect(miner).depositCollateral(stakeAmount);
      expect(await token.hasMinCollateral(miner.address)).to.be.true;
    });
  });

  describe('Slashing', function () {
    const stakeAmount = ethers.parseEther('5000');

    beforeEach(async function () {
      await token.transfer(miner.address, ethers.parseEther('10000'));
      await token.connect(miner).depositCollateral(stakeAmount);
      await token.setDistributor(distributor.address, true);
    });

    it('should slash and burn collateral', async function () {
      const slashAmount = ethers.parseEther('1000');
      const supplyBefore = await token.totalSupply();

      await token.connect(distributor).slashCollateral(miner.address, slashAmount, 'bad results');

      expect(await token.minerCollateral(miner.address)).to.equal(stakeAmount - slashAmount);
      // Slashed tokens burned = reduced supply
      expect(await token.totalSupply()).to.equal(supplyBefore - slashAmount);
    });

    it('should reject slashing by non-distributors', async function () {
      await expect(
        token.connect(user1).slashCollateral(miner.address, ethers.parseEther('100'), 'unauthorized')
      ).to.be.revertedWith('Not authorized');
    });
  });

  describe('Pausable', function () {
    it('should pause and unpause', async function () {
      await token.pause();
      await expect(
        token.transfer(user1.address, ethers.parseEther('100'))
      ).to.be.reverted;

      await token.unpause();
      await token.transfer(user1.address, ethers.parseEther('100'));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther('100'));
    });
  });

  describe('Epoch Rewards', function () {
    it('should return correct initial epoch reward', async function () {
      const reward = await token.currentEpochReward();
      expect(reward).to.equal(ethers.parseEther('323000'));
    });
  });

  describe('Admin', function () {
    it('should allow owner to set fees', async function () {
      await token.setFees(2, 50);
      expect(await token.transferFeePercent()).to.equal(2);
      expect(await token.burnRatePercent()).to.equal(50);
    });

    it('should reject fee > 5%', async function () {
      await expect(token.setFees(6, 20)).to.be.revertedWith('Fee too high');
    });

    it('should reject non-owner admin calls', async function () {
      await expect(
        token.connect(user1).setFees(2, 20)
      ).to.be.reverted;
    });
  });
});
