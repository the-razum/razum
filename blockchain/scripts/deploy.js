const hre = require("hardhat");

async function main() {
  console.log("Deploying RZM Token...");

  const RZMToken = await hre.ethers.getContractFactory("RZMToken");
  const token = await RZMToken.deploy();

  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log(`RZM Token deployed to: ${address}`);
  console.log(`Total supply: 1,000,000,000 RZM`);
  console.log(`Miner reward pool: 500,000,000 RZM`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Set up miner reward distributor");
  console.log("3. Transfer liquidity tokens to DEX");
  console.log("4. Set up vesting for team tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
