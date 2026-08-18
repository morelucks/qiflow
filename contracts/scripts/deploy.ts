import { ethers } from "hardhat";

async function main() {
  console.log("Starting QiFlow Smart Contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  const defaultFeeBps = process.env.PLATFORM_FEE_BPS || 100; // 1%

  // 1. Deploy QiFlowPaymentRouter
  const RouterFactory = await ethers.getContractFactory("QiFlowPaymentRouter");
  const router = await RouterFactory.deploy(platformWallet, defaultFeeBps);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`QiFlowPaymentRouter deployed at: ${routerAddress}`);

  // 2. Deploy QiFlowEscrow
  const EscrowFactory = await ethers.getContractFactory("QiFlowEscrow");
  const escrow = await EscrowFactory.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`QiFlowEscrow deployed at: ${escrowAddress}`);

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
