// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title QiFlowPaymentRouter
 * @notice On-chain payment session router and fee distributor for QiFlow on Quai Network.
 * @dev Allows authorized backend relayers to register payment sessions and customers to settle payments.
 */
contract QiFlowPaymentRouter is Ownable, ReentrancyGuard, Pausable {

    struct PaymentSession {
        bytes32 paymentId;     // Unique payment ID hash
        address merchant;      // Merchant receiving wallet address
        uint256 amount;        // Payment amount in wei
        uint256 feeBps;        // Fee in basis points (e.g. 100 = 1%)
        bool completed;        // Settlement status
        bool refunded;         // Refund status
        uint256 createdAt;     // Creation timestamp
        uint256 expiresAt;     // Expiration timestamp
    }

    // Platform fee receiving wallet
    address public platformWallet;

    // Default fee in basis points (100 = 1%)
    uint256 public defaultFeeBps;

    // Maximum platform fee cap (1000 = 10%)
    uint256 public constant MAX_FEE_BPS = 1000;

    // Basis points denominator (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Payment sessions mapping
    mapping(bytes32 => PaymentSession) public paymentSessions;

    // Authorized relayer addresses (backend services)
    mapping(address => bool) public authorizedRelayers;

    // Events
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed merchant,
        uint256 amount,
        uint256 feeBps,
        uint256 expiresAt
    );

    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed customer,
        address indexed merchant,
        uint256 merchantAmount,
        uint256 feeAmount
    );

    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 amount
    );

    event DefaultFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event PlatformWalletUpdated(address oldWallet, address newWallet);
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    modifier onlyAuthorized() {
        require(
            authorizedRelayers[msg.sender] || msg.sender == owner(),
            "QiFlow: not authorized"
        );
        _;
    }

    constructor(address _platformWallet, uint256 _defaultFeeBps) Ownable(msg.sender) {
        require(_platformWallet != address(0), "QiFlow: zero address platform wallet");
        require(_defaultFeeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        platformWallet = _platformWallet;
        defaultFeeBps = _defaultFeeBps;
    }

    /**
     * @notice Registers a new payment session on-chain.
     */
    function createPaymentSession(
        bytes32 _paymentId,
        address _merchant,
        uint256 _amount,
        uint256 _feeBps,
        uint256 _expiresAt
    ) external onlyAuthorized whenNotPaused {
        require(_paymentId != bytes32(0), "QiFlow: invalid payment ID");
        require(_merchant != address(0), "QiFlow: zero merchant address");
        require(_amount > 0, "QiFlow: amount must be > 0");
        require(_feeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        require(_expiresAt > block.timestamp, "QiFlow: expiration must be in future");
        require(paymentSessions[_paymentId].merchant == address(0), "QiFlow: session already exists");

        paymentSessions[_paymentId] = PaymentSession({
            paymentId: _paymentId,
            merchant: _merchant,
            amount: _amount,
            feeBps: _feeBps,
            completed: false,
            refunded: false,
            createdAt: block.timestamp,
            expiresAt: _expiresAt
        });

        emit PaymentCreated(_paymentId, _merchant, _amount, _feeBps, _expiresAt);
    }

    /**
     * @notice Settles an open payment session.
     */
    function pay(bytes32 _paymentId) external payable nonReentrant whenNotPaused {
        PaymentSession storage session = paymentSessions[_paymentId];
        require(session.merchant != address(0), "QiFlow: session does not exist");
        require(!session.completed, "QiFlow: session already completed");
        require(!session.refunded, "QiFlow: session already refunded");
        require(block.timestamp < session.expiresAt, "QiFlow: session expired");
        require(msg.value == session.amount, "QiFlow: incorrect payment amount");

        session.completed = true;

        uint256 feeAmount = (msg.value * session.feeBps) / BPS_DENOMINATOR;
        uint256 merchantAmount = msg.value - feeAmount;

        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(platformWallet).call{value: feeAmount}("");
            require(feeSuccess, "QiFlow: platform fee transfer failed");
        }

        (bool merchantSuccess, ) = payable(session.merchant).call{value: merchantAmount}("");
        require(merchantSuccess, "QiFlow: merchant payment transfer failed");

        emit PaymentCompleted(_paymentId, msg.sender, session.merchant, merchantAmount, feeAmount);
    }

    /**
     * @notice Processes a refund for a completed payment session.
     */
    function refund(bytes32 _paymentId, address payable _customer) external payable onlyAuthorized nonReentrant {
        PaymentSession storage session = paymentSessions[_paymentId];
        require(session.completed, "QiFlow: payment not completed");
        require(!session.refunded, "QiFlow: payment already refunded");
        require(msg.value == session.amount, "QiFlow: refund amount mismatch");

        session.refunded = true;

        (bool success, ) = _customer.call{value: msg.value}("");
        require(success, "QiFlow: refund transfer failed");

        emit PaymentRefunded(_paymentId, session.merchant, _customer, msg.value);
    }

    function setDefaultFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        uint256 oldFee = defaultFeeBps;
        defaultFeeBps = _feeBps;
        emit DefaultFeeUpdated(oldFee, _feeBps);
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "QiFlow: zero address");
        address oldWallet = platformWallet;
        platformWallet = _wallet;
        emit PlatformWalletUpdated(oldWallet, _wallet);
    }

    function addRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "QiFlow: zero address");
        authorizedRelayers[_relayer] = true;
        emit RelayerAdded(_relayer);
    }

    function removeRelayer(address _relayer) external onlyOwner {
        authorizedRelayers[_relayer] = false;
        emit RelayerRemoved(_relayer);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
