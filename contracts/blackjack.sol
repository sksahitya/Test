// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./interfaces/game.sol";

contract BlackJack is Game {
    constructor(address _casino) Game(_casino) {}

    uint8[] cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    uint8[] cardSuits = [1, 2, 3, 4];
    uint8 numberOfDecks = 6;
    uint16 totalCards = uint16(numberOfDecks * cardSuits.length * cardNumbers.length);
    uint256 seedsViewed;

    mapping(uint8 => mapping(uint8 => uint8)) dealtCards;
    Player[] public players;
    Dealer dealer;

    struct Card {
        uint8 suit;
        uint8 number;
    }
    
    struct Player {
        address player;
        uint48 bet;
        Card card1;
        Card card2;
    }

    struct Dealer {
        Card card1;
        Card card2;
        bool revealed;
    }

    struct DealerView {
        Card card1;
        Card card2;
    }

    modifier noReentry {
        bool isAtTable = false;
        for (uint i = players.length - 1; i >= 0; i--) {
            if (players[i].player == msg.sender) {
                isAtTable = true;
                break;
            }
        }
        require(isAtTable, "You are already sitting at the table.");
        _;
    }

    function joinTable() public onlyMembers noReentry {
      
    }

    function viewDealersCards() public view returns (DealerView memory dealerCards) {
        dealerCards.card1 = dealer.card1;
        if (dealer.revealed) {
            dealerCards.card2 = dealer.card2;
        }
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

    function resetDeck() internal {
        for (uint8 i = 0; i < cardNumbers.length; i++) {
            for (uint8 j = 0; j < cardSuits.length; j++) {
                dealtCards[cardNumbers[i]][cardSuits[j]] = 0;
            }
        }
        totalCards = uint16(numberOfDecks * cardSuits.length * cardNumbers.length);
    }

    function dealCards() internal {
        if (totalCards - (2 + players.length * 2) < 1) resetDeck();
        dealer.revealed = false;
        for (uint i = 0; i < players.length; i++) {
            if (players[i].bet > 0) players[i].card1 = nextCard();
        }
        dealer.card1 = nextCard();
        for (uint i = 0; i < players.length; i++) {
            if (players[i].bet > 0) players[i].card2 = nextCard();
        }
        dealer.card2 = nextCard();
    }
}
