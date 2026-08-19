// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QiFlowEscrow
 * @notice Milestone-based and escrow-backed payment settlement for QiFlow on Quai Network.
 */
contract QiFlowEscrow {
    enum EscrowStatus { Created, Funded, Released, Refunded, Disputed, Resolved }

    struct Milestone {
        string description;
        uint256 amount;
        bool approved;
        bool released;
    }

    struct EscrowSession {
        bytes32 escrowId;
        address payer;
        address payee;
        address arbiter;
        uint256 totalAmount;
        uint256 feeBps;
        EscrowStatus status;
        uint256 createdAt;
        uint256 milestoneCount;
    }

    address public owner;
    address public platformWallet;
    uint256 public defaultFeeBps;

    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    bool public paused;
    uint256 private _status;

    mapping(bytes32 => EscrowSession) public escrowSessions;
    mapping(bytes32 => mapping(uint256 => Milestone)) public escrowMilestones;
    mapping(address => bool) public authorizedRelayers;

    event EscrowCreated(bytes32 indexed escrowId, address indexed payer, address indexed payee, address arbiter, uint256 totalAmount, uint256 feeBps);
    event EscrowFunded(bytes32 indexed escrowId, uint256 amount);
    event MilestoneApproved(bytes32 indexed escrowId, uint256 indexed milestoneIndex);
    event MilestoneReleased(bytes32 indexed escrowId, uint256 indexed milestoneIndex, uint256 amount, uint256 feeAmount);
    event EscrowRefunded(bytes32 indexed escrowId, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId, address indexed initiator);
    event EscrowResolved(bytes32 indexed escrowId, uint256 payeeAmount, uint256 payerAmount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "QiFlow: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedRelayers[msg.sender] || msg.sender == owner, "QiFlow: not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "QiFlow: paused");
        _;
    }

    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    constructor(address _platformWallet, uint256 _defaultFeeBps) {
        require(_platformWallet != address(0), "QiFlow: zero address platform wallet");
        require(_defaultFeeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        owner = msg.sender;
        platformWallet = _platformWallet;
        defaultFeeBps = _defaultFeeBps;
        _status = 1;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function createEscrow(
        bytes32 _escrowId,
        address _payee,
        address _arbiter,
        uint256 _feeBps,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestoneAmounts
    ) external payable whenNotPaused nonReentrant {
        require(_escrowId != bytes32(0), "QiFlow: invalid escrow ID");
        require(_payee != address(0), "QiFlow: zero payee address");
        require(_feeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        require(_milestoneDescs.length > 0, "QiFlow: no milestones");
        require(_milestoneDescs.length == _milestoneAmounts.length, "QiFlow: mismatch milestones");
        require(escrowSessions[_escrowId].payer == address(0), "QiFlow: escrow exists");

        uint256 total = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "QiFlow: milestone amount 0");
            total += _milestoneAmounts[i];
            escrowMilestones[_escrowId][i] = Milestone({
                description: _milestoneDescs[i],
                amount: _milestoneAmounts[i],
                approved: false,
                released: false
            });
        }

        require(msg.value == total, "QiFlow: funded amount mismatch");

        escrowSessions[_escrowId] = EscrowSession({
            escrowId: _escrowId,
            payer: msg.sender,
            payee: _payee,
            arbiter: _arbiter,
            totalAmount: total,
            feeBps: _feeBps,
            status: EscrowStatus.Funded,
            createdAt: block.timestamp,
            milestoneCount: _milestoneAmounts.length
        });

        emit EscrowCreated(_escrowId, msg.sender, _payee, _arbiter, total, _feeBps);
        emit EscrowFunded(_escrowId, total);
    }

    function releaseMilestone(bytes32 _escrowId, uint256 _milestoneIndex) external nonReentrant whenNotPaused {
        EscrowSession storage session = escrowSessions[_escrowId];
        require(session.status == EscrowStatus.Funded || session.status == EscrowStatus.Created, "QiFlow: invalid status");
        require(msg.sender == session.payer || msg.sender == owner, "QiFlow: unauthorized release");
        require(_milestoneIndex < session.milestoneCount, "QiFlow: invalid milestone index");

        Milestone storage m = escrowMilestones[_escrowId][_milestoneIndex];
        require(!m.released, "QiFlow: milestone already released");

        m.approved = true;
        m.released = true;

        uint256 feeAmount = (m.amount * session.feeBps) / BPS_DENOMINATOR;
        uint256 payeeAmount = m.amount - feeAmount;

        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(platformWallet).call{value: feeAmount}("");
            require(feeSuccess, "QiFlow: platform fee transfer failed");
        }

        (bool payeeSuccess, ) = payable(session.payee).call{value: payeeAmount}("");
        require(payeeSuccess, "QiFlow: payee transfer failed");

        emit MilestoneApproved(_escrowId, _milestoneIndex);
        emit MilestoneReleased(_escrowId, _milestoneIndex, payeeAmount, feeAmount);
    }

    function refundEscrow(bytes32 _escrowId) external nonReentrant {
        EscrowSession storage session = escrowSessions[_escrowId];
        require(session.status == EscrowStatus.Funded, "QiFlow: not funded");
        require(msg.sender == session.payee || msg.sender == session.arbiter || msg.sender == owner, "QiFlow: unauthorized refund");

        session.status = EscrowStatus.Refunded;

        (bool success, ) = payable(session.payer).call{value: session.totalAmount}("");
        require(success, "QiFlow: refund transfer failed");

        emit EscrowRefunded(_escrowId, session.totalAmount);
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "QiFlow: zero address");
        platformWallet = _wallet;
    }

    function setDefaultFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "QiFlow: fee exceeds max");
        defaultFeeBps = _feeBps;
    }
}
