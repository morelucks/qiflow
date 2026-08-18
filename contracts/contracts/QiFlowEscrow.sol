// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title QiFlowEscrow
 * @notice Optional smart contract escrow system for high-value or disputed transactions on Quai Network.
 */
contract QiFlowEscrow is Ownable, ReentrancyGuard, Pausable {

    enum EscrowStatus { CREATED, FUNDED, RELEASED, REFUNDED, DISPUTED, RESOLVED }

    struct EscrowItem {
        bytes32 escrowId;      // Unique escrow ID hash
        address payable payer; // Customer locking funds
        address payable payee; // Merchant / recipient
        address arbiter;       // Dispute arbiter (QiFlow platform address)
        uint256 amount;        // Amount in wei
        EscrowStatus status;   // Current escrow lifecycle state
        uint256 timelock;      // Expiration / auto-release timestamp
        uint256 createdAt;     // Creation timestamp
    }

    mapping(bytes32 => EscrowItem) public escrows;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        address arbiter,
        uint256 amount,
        uint256 timelock
    );

    event EscrowReleased(bytes32 indexed escrowId, address indexed payee, uint256 amount);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed payer, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId, address indexed raisedBy);
    event DisputeResolved(bytes32 indexed escrowId, uint256 payeeShare, uint256 payerShare);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates and funds an escrow deposit.
     */
    function createEscrow(
        bytes32 _escrowId,
        address payable _payee,
        address _arbiter,
        uint256 _timelock
    ) external payable nonReentrant whenNotPaused {
        require(_escrowId != bytes32(0), "QiFlowEscrow: invalid escrow ID");
        require(_payee != address(0), "QiFlowEscrow: zero payee address");
        require(_arbiter != address(0), "QiFlowEscrow: zero arbiter address");
        require(msg.value > 0, "QiFlowEscrow: amount must be > 0");
        require(_timelock > block.timestamp, "QiFlowEscrow: timelock must be in future");
        require(escrows[_escrowId].payer == address(0), "QiFlowEscrow: escrow already exists");

        escrows[_escrowId] = EscrowItem({
            escrowId: _escrowId,
            payer: payable(msg.sender),
            payee: _payee,
            arbiter: _arbiter,
            amount: msg.value,
            status: EscrowStatus.FUNDED,
            timelock: _timelock,
            createdAt: block.timestamp
        });

        emit EscrowCreated(_escrowId, msg.sender, _payee, _arbiter, msg.value, _timelock);
    }

    /**
     * @notice Releases escrowed funds to the payee.
     */
    function releaseFunds(bytes32 _escrowId) external nonReentrant whenNotPaused {
        EscrowItem storage item = escrows[_escrowId];
        require(item.status == EscrowStatus.FUNDED, "QiFlowEscrow: escrow not funded");
        require(
            msg.sender == item.payer || msg.sender == item.arbiter || block.timestamp >= item.timelock,
            "QiFlowEscrow: unauthorized to release"
        );

        item.status = EscrowStatus.RELEASED;

        (bool success, ) = item.payee.call{value: item.amount}("");
        require(success, "QiFlowEscrow: release transfer failed");

        emit EscrowReleased(_escrowId, item.payee, item.amount);
    }

    /**
     * @notice Refunds escrowed funds to the payer.
     */
    function refundPayer(bytes32 _escrowId) external nonReentrant whenNotPaused {
        EscrowItem storage item = escrows[_escrowId];
        require(item.status == EscrowStatus.FUNDED, "QiFlowEscrow: escrow not funded");
        require(
            msg.sender == item.payee || msg.sender == item.arbiter,
            "QiFlowEscrow: unauthorized to refund"
        );

        item.status = EscrowStatus.REFUNDED;

        (bool success, ) = item.payer.call{value: item.amount}("");
        require(success, "QiFlowEscrow: refund transfer failed");

        emit EscrowRefunded(_escrowId, item.payer, item.amount);
    }

    /**
     * @notice Flags an active escrow as disputed.
     */
    function raiseDispute(bytes32 _escrowId) external whenNotPaused {
        EscrowItem storage item = escrows[_escrowId];
        require(item.status == EscrowStatus.FUNDED, "QiFlowEscrow: escrow not funded");
        require(
            msg.sender == item.payer || msg.sender == item.payee,
            "QiFlowEscrow: only parties can dispute"
        );

        item.status = EscrowStatus.DISPUTED;
        emit EscrowDisputed(_escrowId, msg.sender);
    }

    /**
     * @notice Arbiter resolves a disputed escrow, splitting funds according to decision.
     */
    function resolveDispute(
        bytes32 _escrowId,
        uint256 _payeeShare,
        uint256 _payerShare
    ) external nonReentrant whenNotPaused {
        EscrowItem storage item = escrows[_escrowId];
        require(item.status == EscrowStatus.DISPUTED, "QiFlowEscrow: escrow not disputed");
        require(msg.sender == item.arbiter || msg.sender == owner(), "QiFlowEscrow: only arbiter can resolve");
        require(_payeeShare + _payerShare == item.amount, "QiFlowEscrow: shares sum must equal total");

        item.status = EscrowStatus.RESOLVED;

        if (_payeeShare > 0) {
            (bool payeeSuccess, ) = item.payee.call{value: _payeeShare}("");
            require(payeeSuccess, "QiFlowEscrow: payee share transfer failed");
        }

        if (_payerShare > 0) {
            (bool payerSuccess, ) = item.payer.call{value: _payerShare}("");
            require(payerSuccess, "QiFlowEscrow: payer share transfer failed");
        }

        emit DisputeResolved(_escrowId, _payeeShare, _payerShare);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
