// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./interfaces/game.sol";

contract BlackJack is Game {
    constructor(address _casino) Game(_casino) {}

    uint8[] cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    uint8[] cardSuits = [1, 2, 3, 4];
    Card[] dealtCards;
    Player[] players;
    uint8 numberOfDecks = 6;
    uint16 totalCards =uint16(numberOfDecks * cardSuits.length * cardNumbers.length);
    uint256 seedsViewed;

    struct Card {
        uint8 suit;
        uint16 number;
    }
    
    struct Player {
        address player;
        uint48 bet;
        Card card1;
        Card card2;
    }

    function randomSeed() internal returns (uint256) {
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp +
                        block.difficulty +
                        ((
                            uint256(keccak256(abi.encodePacked(block.coinbase)))
                        ) / (block.timestamp)) +
                        block.gaslimit +
                        ((uint256(keccak256(abi.encodePacked(msg.sender)))) /
                            (block.timestamp)) +
                        block.number +
                        seedsViewed
                )
            )
        );
        seedsViewed++;
        return ((seed - ((seed / 1000) * 1000)));
    }

    function randomCardNumber() internal returns (uint8) {
        return uint8((randomSeed() % 13) + 1);
    }

    function randomSuit() internal returns (uint8) {
        return uint8((randomSeed() % 4) + 1);
    }

    function selectRandomCard() internal returns (Card memory card) {
        card.suit = randomSuit();
        card.number = randomCardNumber();
        return card;
    }
}
