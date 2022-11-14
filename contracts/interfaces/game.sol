// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./casino.sol";

contract Game {
    CasinoInterface public casino;

    address payable owner;

    event ChipsGiven(address indexed user, uint48 amount, uint48 timestamp);
    event ChipsTaken(address indexed user, uint48 amount, uint48 timestamp);

    constructor(address _casino) {
        casino = CasinoInterface(_casino);
        owner = payable(msg.sender);
    }

    modifier onlyMembers() {
        require(casino.isMember(msg.sender), "Only members can use this function.");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can use this function.");
        _;
    }

    function transferOwnership(address payable newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setCasinoContract(address newContract)
        external
        onlyOwner
    {
        casino = CasinoInterface(newContract);
    }

    function payout(address to, uint48 amount) internal {
        casino.giveChips(to, amount);
        emit ChipsGiven(to, amount, uint48(block.timestamp));
    }

    function takeChips(address from, uint48 amount) internal {
        casino.takeChips(from, amount);
        emit ChipsTaken(from, amount, uint48(block.timestamp));
    }

}