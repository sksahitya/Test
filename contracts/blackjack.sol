// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./interfaces/game.sol";

contract BlackJack is Game {
    constructor(address _casino) Game(_casino) {}

    uint8[] cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    uint8[] cardSuits = [1, 2, 3, 4];
    uint8 numberOfDecks = 20;
    uint16 totalCards = uint16(numberOfDecks * cardSuits.length * cardNumbers.length);
    uint16 numberOfCutCards = 40;
    uint256 seedsViewed;
    event DeckShuffled(uint16 cutCards, uint48 timestamp);
    event DealtPlayerCard(address player, uint8 cardNumber, uint8 cardSuit);
    event DealtDealerCard(uint8 cardNumber, uint8 cardSuit);
    event DealerRevealedCard(uint8 cardNumber, uint8 cardSuit);
    event DealerBust(uint8 dealerCardsTotal, uint8 dealerCardCount);
    event DealerBlackJack(uint48 timestamp);
    event PlayerWin(
        address player,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerBust(
        address player,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerPush(
        address player,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerHit(
        address player,
        uint8 cardNumber,
        uint8 cardSuit,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerDoubleDown(address player, uint8 cardNumber, uint8 cardSuit);
    event PlayerStand(
        address player,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerBlackJack(address player);
    event PlayerInsurance(address player);
    event PlayerSplit(
        address player,
        uint8 cardNumber,
        uint8 cardSuit1,
        uint8 cardSuit2
    );

    mapping(uint8 => mapping(uint8 => uint8)) dealtCards;
    mapping(address => Player) public players;
    address[] public playerAddresses;
    Dealer public dealer;
    Card dealerUnrevealed;

    struct Card {
        uint8 suit;
        uint8 number;
    }

    struct PlayerCard {
        Card card;
        uint8 splitNumber;
    }

    struct Player {
        bool atTable;
        uint48 bet;
        PlayerCard[] cards;
        bool finishedActing;
    }

    struct Dealer {
        Card[] cards;
        bool revealed;
    }

    function joinTable() public onlyMembers {
        require(
            !players[msg.sender].atTable,
            "You are already sitting at the table."
        );
        players[msg.sender].atTable = true;
        playerAddresses.push(msg.sender);
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

    function resetDeck(uint16 cutCount) internal {
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

    function rotatePlaces() internal {
        address c = playerAddresses[0];
        for (uint256 i = 0; i < playerAddresses.length - 1; i++) {
            playerAddresses[i] = i == playerAddresses.length - 1
                ? c
                : playerAddresses[i + 1];
        }
    }

    function dealCards() internal {
        if (totalCards - (12 + playerAddresses.length * 12) < 1)
            resetDeck(numberOfCutCards);
        rotatePlaces();
        delete dealer.cards;
        dealer.revealed = false;
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            delete players[playerAddresses[i]].cards;
            players[playerAddresses[i]].finishedActing = false;
            if (players[playerAddresses[i]].bet > 0) {
                Card memory next = nextCard();
                players[playerAddresses[i]].cards.push(
                    PlayerCard({card: next, splitNumber: 0})
                );
                emit DealtPlayerCard(
                    playerAddresses[i],
                    next.number,
                    next.suit
                );
            }
        }
        dealer.cards.push(nextCard());
        emit DealtDealerCard(dealer.cards[0].number, dealer.cards[0].suit);
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].bet > 0) {
                Card memory next = nextCard();
                players[playerAddresses[i]].cards.push(
                    PlayerCard({card: next, splitNumber: 0})
                );
                emit DealtPlayerCard(
                    playerAddresses[i],
                    next.number,
                    next.suit
                );
                if (
                    (players[playerAddresses[i]].cards[0].card.number == 1 &&
                        players[playerAddresses[i]].cards[1].card.number >=
                        10) ||
                    (players[playerAddresses[i]].cards[0].card.number >= 10 &&
                        players[playerAddresses[i]].cards[1].card.number == 1)
                ) {
                    emit PlayerBlackJack(playerAddresses[i]);
                }
            }
        }
        dealerUnrevealed = nextCard();
        bool dealerBlackjack = (dealer.cards[0].number == 1 &&
            dealerUnrevealed.number >= 10) ||
            (dealer.cards[0].number >= 10 && dealerUnrevealed.number == 1);
        if (dealerBlackjack) {
            dealer.cards.push(dealerUnrevealed);
            dealer.revealed = true;
            emit DealerRevealedCard(
                dealerUnrevealed.number,
                dealerUnrevealed.suit
            );
            emit DealerBlackJack(uint48(block.timestamp));
        }
        for (uint256 i; i < playerAddresses.length; i++) {
            if (dealerBlackjack) {
                if (
                    (players[playerAddresses[i]].cards[0].card.number == 1 &&
                        players[playerAddresses[i]].cards[1].card.number >=
                        10) ||
                    (players[playerAddresses[i]].cards[0].card.number >= 10 &&
                        players[playerAddresses[i]].cards[1].card.number == 1)
                ) {
                    players[playerAddresses[i]].finishedActing = true;
                    players[playerAddresses[i]].bet = uint48(
                        (uint256(players[playerAddresses[i]].bet) * 3) / 2
                    );
                    uint8 cardTotal;
                    for (uint z = 0; z < players[playerAddresses[i]].cards.length; z++) {
                        cardTotal += players[playerAddresses[i]].cards[z].card.number;
                    }
                    emit PlayerWin(playerAddresses[i], uint8(players[playerAddresses[i]].cards.length), cardTotal);
                } else {
                    players[playerAddresses[i]].bet = 0;
                    players[playerAddresses[i]].finishedActing = true;
                }
            } else {
                if (
                    (players[playerAddresses[i]].cards[0].card.number == 1 &&
                        players[playerAddresses[i]].cards[1].card.number >=
                        10) ||
                    (players[playerAddresses[i]].cards[0].card.number >= 10 &&
                        players[playerAddresses[i]].cards[1].card.number == 1)
                ) {
                    emit PlayerBlackJack(playerAddresses[i]);
                    payout(
                        playerAddresses[i],
                        (players[playerAddresses[i]].bet * 3) / 2
                    );
                    players[playerAddresses[i]].bet = 0;
                    players[playerAddresses[i]].finishedActing = true;
                }
            }
        }
    }
}
