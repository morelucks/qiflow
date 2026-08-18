const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiFlowEscrow", function () {
  let escrow;
  let owner;
  let payer;
  let payee;
  let arbiter;

  const escrowId = ethers.keccak256(ethers.toUtf8Bytes("escrow_test_001"));
  const amount = ethers.parseEther("5"); // 5 Qi

  beforeEach(async function () {
    [owner, payer, payee, arbiter] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("QiFlowEscrow");
    escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
  });

  describe("Escrow Lifecycle", function () {
    it("should allow payer to create and fund an escrow", async function () {
      const timelock = Math.floor(Date.now() / 1000) + 7200;

      await expect(
        escrow.connect(payer).createEscrow(escrowId, payee.address, arbiter.address, timelock, { value: amount })
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(escrowId, payer.address, payee.address, arbiter.address, amount, timelock);

      const item = await escrow.escrows(escrowId);
      expect(item.payer).to.equal(payer.address);
      expect(item.payee).to.equal(payee.address);
      expect(item.amount).to.equal(amount);
      expect(item.status).to.equal(1); // EscrowStatus.FUNDED
    });

    it("should allow payer to release funds to payee", async function () {
      const timelock = Math.floor(Date.now() / 1000) + 7200;
      await escrow.connect(payer).createEscrow(escrowId, payee.address, arbiter.address, timelock, { value: amount });

      const initialPayeeBalance = await ethers.provider.getBalance(payee.address);

      await expect(escrow.connect(payer).releaseFunds(escrowId))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(escrowId, payee.address, amount);

      const finalPayeeBalance = await ethers.provider.getBalance(payee.address);
      expect(finalPayeeBalance - initialPayeeBalance).to.equal(amount);

      const item = await escrow.escrows(escrowId);
      expect(item.status).to.equal(2); // EscrowStatus.RELEASED
    });

    it("should allow payee to refund payer", async function () {
      const timelock = Math.floor(Date.now() / 1000) + 7200;
      await escrow.connect(payer).createEscrow(escrowId, payee.address, arbiter.address, timelock, { value: amount });

      await expect(escrow.connect(payee).refundPayer(escrowId))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(escrowId, payer.address, amount);

      const item = await escrow.escrows(escrowId);
      expect(item.status).to.equal(3); // EscrowStatus.REFUNDED
    });

    it("should allow raise dispute and arbiter resolution", async function () {
      const timelock = Math.floor(Date.now() / 1000) + 7200;
      await escrow.connect(payer).createEscrow(escrowId, payee.address, arbiter.address, timelock, { value: amount });

      await expect(escrow.connect(payer).raiseDispute(escrowId))
        .to.emit(escrow, "EscrowDisputed")
        .withArgs(escrowId, payer.address);

      const payeeShare = ethers.parseEther("3");
      const payerShare = ethers.parseEther("2");

      await expect(escrow.connect(arbiter).resolveDispute(escrowId, payeeShare, payerShare))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(escrowId, payeeShare, payerShare);

      const item = await escrow.escrows(escrowId);
      expect(item.status).to.equal(5); // EscrowStatus.RESOLVED
    });
  });
});
