// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PokerPot is Ownable {
    error InvalidToken();

    mapping(address => bool) private allowedTokens;

    event TokenAllowlistUpdated(address indexed token, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }
}
