// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockERC20} from "./MockERC20.sol";

contract MockFeeOnTransferERC20 is MockERC20 {
    uint256 private constant FEE_BASIS_POINTS = 1_000;
    uint256 private constant BASIS_POINTS = 10_000;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) MockERC20(name_, symbol_, decimals_) {}

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = (value * FEE_BASIS_POINTS) / BASIS_POINTS;
            super._update(from, address(0), fee);
            super._update(from, to, value - fee);
            return;
        }

        super._update(from, to, value);
    }
}
