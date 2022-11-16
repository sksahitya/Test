// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;


contract Deck {
    
    struct Card {
        uint8 suit;
        uint8 number;
    }
    event DeckShuffled(uint16 cutCards, uint48 timestamp);

    mapping(uint8 => mapping(uint8 => uint8)) dealtCards;

    uint8[] cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    uint8[] cardSuits = [1, 2, 3, 4];
    uint8 numberOfDecks;
    uint16 totalCards = uint16(numberOfDecks * cardSuits.length * cardNumbers.length);
    uint16 numberOfCutCards;
    uint256 seedsViewed;

    constructor(uint8 _numberOfDecks, uint16 _numberOfCutCards) {
        numberOfCutCards = _numberOfCutCards;
        numberOfDecks = _numberOfDecks;
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

    function notDealt(uint8 _number, uint8 _suit) internal view returns (bool) {
        return dealtCards[_number][_suit] < numberOfDecks;
    }

    function selectRandomCard() internal returns (Card memory card) {
        card.suit = randomSuit();
        card.number = randomCardNumber();
        return card;
    }

    function nextCard() internal returns (Card memory card) {
        if (totalCards < 1) revert("No more cards left in the deck.");
        card = selectRandomCard();
        while (!notDealt(card.number, card.suit)) card = selectRandomCard();
        dealtCards[card.number][card.suit]++;
        totalCards--;
    }

    function shuffleDeck(uint16 cutCount) internal {
        for (uint8 i = 0; i < cardNumbers.length; i++) {
            for (uint8 j = 0; j < cardSuits.length; j++) {
                dealtCards[cardNumbers[i]][cardSuits[j]] = 0;
            }
        }
        totalCards = uint16(
            numberOfDecks * cardSuits.length * cardNumbers.length
        );
        for (uint16 i = 0; i < cutCount; i++) nextCard();
        emit DeckShuffled(cutCount, uint48(block.timestamp));
    }

}