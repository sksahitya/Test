// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;
import "./interfaces/erc20.sol";

contract Chips is ERC20 {
    address house;
    address owner;

    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
    {
        owner = msg.sender;
    }

    modifier onlyHouse() {
        require(msg.sender == house, "Only the house may call this function.");
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner may call this function.");
        _;
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    function mint(address player, uint256 amount) public onlyHouse {
        _mint(player, amount);
    }

    function burn(address player, uint256 amount) public onlyHouse {
        _burn(player, amount);
    }

    function setHouse(address newHouse) public onlyOwner {
        house = newHouse;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }
}
