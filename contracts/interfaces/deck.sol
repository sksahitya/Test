// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

contract Deck {
    struct Card {
        uint8 suit;
        uint8 number;
    }
    event DeckShuffled(uint48 timestamp);

    mapping(uint8 => mapping(uint8 => uint8)) dealtCards;

    uint8[13] cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    uint8[4] cardSuits = [1, 2, 3, 4];
    uint8 numberOfDecks;
    uint16 totalCards;
    uint256 seedsViewed;
    uint256 seed;
    uint256 lastSeedStamp;

    constructor(uint8 _numberOfDecks) {
        numberOfDecks = _numberOfDecks;
        totalCards = uint16(
            numberOfDecks * 52
        );
    }

    function randomSeed() internal returns (uint256) {
        if (block.timestamp != lastSeedStamp) {
            seed = uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp +
                            block.difficulty +
                            ((
                                uint256(
                                    keccak256(abi.encodePacked(block.coinbase))
                                )
                            ) / (block.timestamp)) +
                            block.gaslimit +
                            ((
                                uint256(keccak256(abi.encodePacked(msg.sender)))
                            ) / (block.timestamp)) +
                            block.number +
                            seedsViewed
                    )
                )
            );
            lastSeedStamp = block.timestamp;
        }
        seedsViewed++;
        return (
            ((seed + seedsViewed) - (((seed + seedsViewed) / 1000) * 1000))
        );
    }

    function randomCardNumber() internal returns (uint8) {
        return uint8((randomSeed() % 13) + 1);
    }

    function randomSuit() internal returns (uint8) {
        return uint8((randomSeed() % 4) + 1);
    }

    function notDealt(uint8 _number, uint8 _suit) internal view returns (bool) {
        return dealtCards[_number][_suit] < numberOfDecks;
    }

    function selectRandomCard() internal returns (Card memory card) {
        card.suit = randomSuit();
        card.number = randomCardNumber();
        return card;
    }

    function nextCard() internal returns (Card memory card) {
        card = selectRandomCard();
        if (!notDealt(card.number, card.suit))
            while (!notDealt(card.number, card.suit)) card = selectRandomCard();
        dealtCards[card.number][card.suit]++;
        totalCards--;
    }

    function shuffleDeck() internal {
        for (uint8 i = 0; i < 13; i++) {
            for (uint8 j = 0; j < 4; j++) {
                dealtCards[cardNumbers[i]][cardSuits[j]] = 0;
            }
        }
        totalCards = uint16(
            numberOfDecks * 52
        );
        emit DeckShuffled(uint48(block.timestamp));
    }
}