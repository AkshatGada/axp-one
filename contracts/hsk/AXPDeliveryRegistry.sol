// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Operator-attested provenance, not an HSP verifier or proof of mainnet payment.
/// Source payment chain is explicit. This contract never holds or transfers funds.
contract AXPDeliveryRegistry {
    address public immutable registrar;
    struct Evidence {
        bytes32 receiptHash;
        bytes32 paymentReference;
        uint256 sourceChainId;
        address token;
        address payer;
        address recipient;
        uint256 merchantMicroUsd;
        uint256 authorizationRaw;
        bytes32 paymentTransaction;
        uint256 transferLogIndex;
    }
    mapping(bytes32 => bytes32) public commitments;
    mapping(bytes32 => bytes32) public paymentDeliveries;
    event EvidenceRecorded(bytes32 indexed delivery, bytes32 indexed paymentReference, bytes32 commitment, uint256 sourceChainId, bytes32 paymentTransaction);
    error Unauthorized();
    error InvalidEvidence();
    error ConflictingEvidence();
    constructor(address registrar_) {
        if (registrar_ == address(0)) revert InvalidEvidence();
        registrar = registrar_;
    }
    function recordEvidence(bytes32 delivery, Evidence calldata e) external {
        if (msg.sender != registrar) revert Unauthorized();
        if (delivery == bytes32(0) || e.receiptHash == bytes32(0) || e.paymentReference == bytes32(0)
            || e.sourceChainId != 133 || e.token == address(0) || e.payer == address(0)
            || e.recipient == address(0) || e.payer == e.recipient || e.merchantMicroUsd == 0
            || e.authorizationRaw == 0 || e.paymentTransaction == bytes32(0)) revert InvalidEvidence();
        bytes32 commitment = keccak256(abi.encode(e));
        bytes32 old = commitments[delivery];
        if (old != bytes32(0)) {
            if (old != commitment) revert ConflictingEvidence();
            return;
        }
        if (paymentDeliveries[e.paymentReference] != bytes32(0)) revert ConflictingEvidence();
        commitments[delivery] = commitment;
        paymentDeliveries[e.paymentReference] = delivery;
        emit EvidenceRecorded(delivery, e.paymentReference, commitment, e.sourceChainId, e.paymentTransaction);
    }
}
