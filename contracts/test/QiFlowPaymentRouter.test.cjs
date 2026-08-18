const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QiFlowPaymentRouter", function () {
  let router;
  let owner;
  let relayer;
  let merchant;
  let customer;
  let platformWallet;

  const defaultFeeBps = 100; // 1%

  beforeEach(async function () {
    [owner, relayer, merchant, customer, platformWallet] = await ethers.getSigners();

    const RouterFactory = await ethers.getContractFactory("QiFlowPaymentRouter");
    router = await RouterFactory.deploy(platformWallet.address, defaultFeeBps);
    await router.waitForDeployment();

    // Add relayer
    await router.connect(owner).addRelayer(relayer.address);
  });

  describe("Deployment", function () {
    it("should set platformWallet and defaultFeeBps correctly", async function () {
      expect(await router.platformWallet()).to.equal(platformWallet.address);
      expect(await router.defaultFeeBps()).to.equal(defaultFeeBps);
    });

    it("should register relayer as authorized", async function () {
      expect(await router.authorizedRelayers(relayer.address)).to.be.true;
    });
  });

  describe("Payment Sessions", function () {
    const paymentId = ethers.keccak256(ethers.toUtf8Bytes("pay_test_001"));
    const amount = ethers.parseEther("10"); // 10 Qi
    const feeBps = 100; // 1%

    it("should allow authorized relayer to create payment session", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        router.connect(relayer).createPaymentSession(paymentId, merchant.address, amount, feeBps, expiresAt)
      )
        .to.emit(router, "PaymentCreated")
        .withArgs(paymentId, merchant.address, amount, feeBps, expiresAt);

      const session = await router.paymentSessions(paymentId);
      expect(session.merchant).to.equal(merchant.address);
      expect(session.amount).to.equal(amount);
      expect(session.completed).to.be.false;
    });

    it("should allow customer to settle payment session with correct fee split", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      await router.connect(relayer).createPaymentSession(paymentId, merchant.address, amount, feeBps, expiresAt);

      const expectedFee = (amount * BigInt(feeBps)) / 10000n;
      const expectedMerchantAmount = amount - expectedFee;

      const initialMerchantBalance = await ethers.provider.getBalance(merchant.address);
      const initialPlatformBalance = await ethers.provider.getBalance(platformWallet.address);

      await expect(router.connect(customer).pay(paymentId, { value: amount }))
        .to.emit(router, "PaymentCompleted")
        .withArgs(paymentId, customer.address, merchant.address, expectedMerchantAmount, expectedFee);

      const finalMerchantBalance = await ethers.provider.getBalance(merchant.address);
      const finalPlatformBalance = await ethers.provider.getBalance(platformWallet.address);

      expect(finalMerchantBalance - initialMerchantBalance).to.equal(expectedMerchantAmount);
      expect(finalPlatformBalance - initialPlatformBalance).to.equal(expectedFee);

      const session = await router.paymentSessions(paymentId);
      expect(session.completed).to.be.true;
    });

    it("should revert payment if session is already completed", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      await router.connect(relayer).createPaymentSession(paymentId, merchant.address, amount, feeBps, expiresAt);
      await router.connect(customer).pay(paymentId, { value: amount });

      await expect(router.connect(customer).pay(paymentId, { value: amount })).to.be.revertedWith(
        "QiFlow: session already completed"
      );
    });

    it("should revert payment if incorrect value sent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      await router.connect(relayer).createPaymentSession(paymentId, merchant.address, amount, feeBps, expiresAt);

      await expect(router.connect(customer).pay(paymentId, { value: ethers.parseEther("5") })).to.be.revertedWith(
        "QiFlow: incorrect payment amount"
      );
    });
  });

  describe("Admin & Circuit Breakers", function () {
    it("should allow owner to pause and unpause", async function () {
      await router.connect(owner).pause();

      const paymentId = ethers.keccak256(ethers.toUtf8Bytes("pay_test_paused"));
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        router.connect(relayer).createPaymentSession(paymentId, merchant.address, 100, 100, expiresAt)
      ).to.be.revertedWithCustomError(router, "EnforcedPause");

      await router.connect(owner).unpause();

      await expect(
        router.connect(relayer).createPaymentSession(paymentId, merchant.address, 100, 100, expiresAt)
      ).to.emit(router, "PaymentCreated");
    });
  });
});
