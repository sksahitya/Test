// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./casino.sol";

contract Game {
    CasinoInterface public casino;

    address payable owner;

    constructor(address _casino) {
        casino = CasinoInterface(_casino);
        owner = payable(msg.sender);
    }

    modifier onlyMembers() {
        require(
            casino.isMember(msg.sender),
            "Only members can use this function."
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can use this function.");
        _;
    }

    function transferOwnership(address payable newOwner) public onlyOwner {
        owner = newOwner;
    }

    function setCasinoContract(address newContract) public onlyOwner {
        casino = CasinoInterface(newContract);
    }

    function payout(address to, uint48 amount) internal {
        casino.giveChips(to, amount);
    }

    function takeChips(address from, uint48 amount) internal {
        casino.takeChips(from, amount);
    }
    
}