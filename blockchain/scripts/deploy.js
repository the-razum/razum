const hre = require('hardhat');

async function main() {
  const network = hre.network.name;
  console.log(`Deploying RZM Token to ${network}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');

  const RZMToken = await hre.ethers.getContractFactory('RZMToken');
  const token = await RZMToken.deploy();
  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log('');
  console.log('=== RZM Token Deployed ===');
  console.log('Address:     ', address);
  console.log('Network:     ', network);
  console.log('Total supply: 1,000,000,000 RZM');
  console.log('Miner pool:   500,000,000 RZM');
  console.log('');

  // Verify on Basescan if not localhost
  if (network !== 'localhost' && network !== 'hardhat') {
    console.log('Waiting 30s for block confirmations before verification...');
    await new Promise(r => setTimeout(r, 30000));
    try {
      await hre.run('verify:verify', {
        address: address,
        constructorArguments: [],
      });
      console.log('Contract verified on explorer!');
    } catch (e) {
      console.log('Verification failed (may need manual):', e.message);
    }
  }

  console.log('');
  console.log('Next steps:');
  console.log('1. Set distributor:  token.setDistributor(coordinatorAddress, true)');
  console.log('2. Create liquidity: transfer 100M RZM to Uniswap pool');
  console.log('3. Set vesting:      deploy VestingContract for team tokens');
  console.log(`4. Save address:     ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
