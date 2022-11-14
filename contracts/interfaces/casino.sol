// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface CasinoInterface {
    function giveChips(address to, uint48 amount) external;
    function takeChips(address to, uint48 amount) external;
    function isMember(address member) external view returns (bool hasMembership);
}