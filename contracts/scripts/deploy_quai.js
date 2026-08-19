require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();
const https = require("https");
const { quais } = require("quais");
const hre = require("hardhat");

const RPC_URL = process.env.QUAI_RPC_URL || "https://orchard.rpc.quai.network/cyprus1";

function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() });
    const req = https.request(
      RPC_URL,
      { method: "POST", family: 4, headers: { "Content-Type": "application/json", "Content-Length": data.length } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) return reject(new Error(JSON.stringify(parsed.error)));
            resolve(parsed.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function grindSalt(sender, nonce, initialData) {
  const toZone = quais.getZoneForAddress(sender);
  const salt = new Uint8Array(4);
  new DataView(salt.buffer).setUint32(0, Number(nonce) & 0xffffffff, false);
  for (let i = 0; i < 20000; i++) {
    const dataWithSalt = quais.hexlify(quais.concat([initialData, salt]));
    const contractAddress = quais.getCreateAddress({ from: sender, nonce: BigInt(nonce), data: dataWithSalt });
    const contractZone = quais.getZoneForAddress(contractAddress);
    const isQi = quais.isQiAddress(contractAddress);
    if (contractZone === toZone && !isQi) {
      return { data: dataWithSalt, contractAddress };
    }
    let saltValue = new DataView(salt.buffer).getUint32(0, false);
    saltValue++;
    new DataView(salt.buffer).setUint32(0, saltValue, false);
  }
  throw new Error("Could not grind Cyprus-1 contract address");
}

async function waitForReceipt(txHash) {
  console.log(`Polling receipt for ${txHash}...`);
  for (let i = 0; i < 40; i++) {
    try {
      const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
      if (receipt) {
        if (receipt.status === "0x0") {
          throw new Error(`Transaction ${txHash} reverted (status 0x0).`);
        }
        return receipt;
      }
    } catch (err) {
      if (err.message.includes("reverted")) throw err;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Tx ${txHash} timeout`);
}

async function deployContract(contractName, constructorArgs) {
  console.log(`\n==========================================`);
  console.log(`Deploying ${contractName}...`);
  console.log(`==========================================`);

  const wallet = new quais.Wallet(process.env.PRIVATE_KEY);
  const hexNonce = await rpcCall("eth_getTransactionCount", [wallet.address, "latest"]);
  const nonce = parseInt(hexNonce, 16);

  const hexGasPrice = await rpcCall("eth_gasPrice", []);
  const baseGasPrice = BigInt(hexGasPrice);
  const gasPrice = (baseGasPrice * 130n) / 100n > 2500000000n ? (baseGasPrice * 130n) / 100n : 2500000000n;

  const artifact = await hre.artifacts.readArtifact(contractName);
  const iface = new quais.Interface(artifact.abi);
  const encodedArgs = iface.encodeDeploy(constructorArgs);
  const initialData = quais.concat([artifact.bytecode, encodedArgs]);

  const grindRes = grindSalt(wallet.address, nonce, initialData);
  console.log(`Nonce: ${nonce} | Predicted Cyprus-1 Address: ${grindRes.contractAddress}`);

  const tx = {
    from: wallet.address,
    nonce: nonce,
    gasLimit: 6000000n,
    gasPrice: gasPrice,
    data: grindRes.data,
    chainId: 15000n,
  };

  const signedTx = await wallet.signTransaction(tx);
  console.log(`Broadcasting raw transaction...`);
  const txHash = await rpcCall("quai_sendRawTransaction", [signedTx]);
  console.log(`Tx Hash: ${txHash}`);

  const receipt = await waitForReceipt(txHash);
  console.log(`✅ ${contractName} DEPLOYED SUCCESS! Address: ${receipt.contractAddress} (GasUsed: ${parseInt(receipt.gasUsed, 16)})`);
  return receipt.contractAddress;
}

async function main() {
  console.log("Starting Production Quai Smart Contracts Deployment...");
  const wallet = new quais.Wallet(process.env.PRIVATE_KEY);
  const platformWallet = process.env.PLATFORM_WALLET || wallet.address;
  const defaultFeeBps = process.env.PLATFORM_FEE_BPS ? parseInt(process.env.PLATFORM_FEE_BPS) : 100;

  const routerAddress = await deployContract("QiFlowPaymentRouterClean", [platformWallet, defaultFeeBps]);
  const escrowAddress = await deployContract("QiFlowEscrowClean", [platformWallet, defaultFeeBps]);

  console.log("\n==========================================");
  console.log("ALL SMART CONTRACTS DEPLOYED SUCCESSFULLY!");
  console.log(`QiFlowPaymentRouter: ${routerAddress}`);
  console.log(`QiFlowEscrow:        ${escrowAddress}`);
  console.log("==========================================\n");
}

main().catch((err) => {
  console.error("Deployment Error:", err);
  process.exitCode = 1;
});
