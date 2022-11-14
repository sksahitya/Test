// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./interfaces/coin.sol";

contract Casino {
    ChipInterface public chipContract;

    address payable owner;

    uint256 public membershipFee = 1 * 10**16;
    uint48 public initialChipCount = 1000;

    event ChipsGiven(address indexed user, uint48 amount, uint48 timestamp);
    event ChipsTaken(address indexed user, uint48 amount, uint48 timestamp);
    event NewMember(
        address indexed player,
        uint48 timestamp,
        uint48 initialChipCount
    );

    address[] members;
    address[] games;

    constructor(address chips) {
        chipContract = ChipInterface(chips);
        owner = payable(msg.sender);
    }

    modifier noReentry {
        bool alreadyMember = false;
        for (uint i = members.length - 1; i >= 0; i--) {
            if (members[i] == msg.sender) {
                alreadyMember = true;
                break;
            }
        }
        require(alreadyMember, "You are already a member of the casino.");
        _;
    }

    modifier onlyMembers() {
        bool isAllowed = false;
        for (uint256 i = members.length - 1; i >= 0; i--) {
            if (members[i] == msg.sender) {
                isAllowed = true;
                break;
            }
        }
        require(isAllowed, "Only members can use this function.");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can use this function.");
        _;
    }

    modifier onlyGames() {
        bool isAllowed = false;
        for (uint256 i = games.length - 1; i >= 0; i--) {
            if (games[i] == msg.sender) {
                isAllowed = true;
                break;
            }
        }
        require(isAllowed, "Only games can use this function.");
        _;
    }

    function transferOwnership(address payable newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setChipContract(address newContract, bool supplyMembers)
        external
        onlyOwner
    {
        chipContract = ChipInterface(newContract);
        if (supplyMembers) {
            for (uint256 i = members.length - 1; i >= 0; i--) {
                chipContract.mint(members[i], initialChipCount);
            }
        }
    }

    function setInitialChipCount(uint48 newChipCount) external onlyOwner {
        initialChipCount = newChipCount;
    }

    function setMembershipFee(uint256 fee) external onlyOwner {
        membershipFee = fee;
    }

    function joinCasino() external payable noReentry {
        require(msg.value == membershipFee, "Must send membershipFee");
        owner.transfer(msg.value);
        members.push(msg.sender);
        chipContract.mint(msg.sender, initialChipCount);
        emit NewMember(msg.sender, uint48(block.timestamp), initialChipCount);
    }

    function giveChips(address to, uint48 amount) external onlyGames {
        chipContract.mint(to, amount);
        emit ChipsGiven(to, amount, uint48(block.timestamp));
    }

    function takeChips(address from, uint48 amount) external onlyGames {
        chipContract.burn(from, amount);
        emit ChipsTaken(from, amount, uint48(block.timestamp));
    }

    function addGame(address game) external onlyOwner {
        games.push(game);
    }

    function removeGame(address game) external onlyOwner {
        for (uint256 i = games.length - 1; i >= 0; i--) {
            if (games[i] == game) {
                delete games[i];
                break;
            }
        }
    }

    function isGame(address _address) public view returns (bool) {
        bool validGame = false;
        for (uint256 i = games.length - 1; i >= 0; i--) {
            if (games[i] == _address) {
                validGame = true;
                break;
            }
        }
        return validGame;
    }

    function isMember(address _address) public view returns (bool) {
        bool validMember = false;
        for (uint256 i = members.length - 1; i >= 0; i--) {
            if (members[i] == _address) {
                validMember = true;
                break;
            }
        }
        return validMember;
    }
}