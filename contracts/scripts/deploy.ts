import { quais } from "quais";
import * as hre from "hardhat";

async function main() {
  console.log("Starting QiFlow Smart Contracts deployment to Quai Network...");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("No PRIVATE_KEY set in contracts/.env");
  }

  const rpcUrl = process.env.QUAI_RPC_URL || "https://orchard.rpc.quai.network/cyprus1";
  console.log(`Connecting to RPC: ${rpcUrl}`);

  const provider = new quais.JsonRpcProvider(rpcUrl, undefined, { usePathing: true });
  const wallet = new quais.Wallet(privateKey, provider);

  const deployerAddress = await wallet.getAddress();
  console.log(`Deployer address: ${deployerAddress}`);

  const platformWallet = process.env.PLATFORM_WALLET || deployerAddress;
  const defaultFeeBps = process.env.PLATFORM_FEE_BPS ? parseInt(process.env.PLATFORM_FEE_BPS) : 100; // 1%

  // 1. Deploy QiFlowPaymentRouter
  console.log("Deploying QiFlowPaymentRouter...");
  const routerArtifact = await hre.artifacts.readArtifact("QiFlowPaymentRouter");
  const RouterFactory = new quais.ContractFactory(routerArtifact.abi, routerArtifact.bytecode, wallet);
  const routerContract = await RouterFactory.deploy(platformWallet, defaultFeeBps);
  await routerContract.waitForDeployment();
  const routerAddress = await routerContract.getAddress();
  console.log(`QiFlowPaymentRouter deployed at: ${routerAddress}`);

  // 2. Deploy QiFlowEscrow
  console.log("Deploying QiFlowEscrow...");
  const escrowArtifact = await hre.artifacts.readArtifact("QiFlowEscrow");
  const EscrowFactory = new quais.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
  const escrowContract = await EscrowFactory.deploy();
  await escrowContract.waitForDeployment();
  const escrowAddress = await escrowContract.getAddress();
  console.log(`QiFlowEscrow deployed at: ${escrowAddress}`);

  console.log("\n==========================================");
  console.log("Deployment Complete!");
  console.log(`QiFlowPaymentRouter: ${routerAddress}`);
  console.log(`QiFlowEscrow:        ${escrowAddress}`);
  console.log("==========================================\n");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
