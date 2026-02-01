// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract KeyRegistry {
    mapping(address => bytes32) public pk;

    event PubKeySet(address indexed user, bytes32 pubKey);

    function setPubKey(bytes32 pubKey) external {
        pk[msg.sender] = pubKey;
        emit PubKeySet(msg.sender, pubKey);
    }
}