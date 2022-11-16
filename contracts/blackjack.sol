// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

import "./interfaces/game.sol";
import "./interfaces/deck.sol";

contract BlackJack is Game, Deck {
    constructor(
        address _casino,
        uint8 _numberOfDecks,
        uint16 _numberOfCutCards
    ) Game(_casino) Deck(_numberOfDecks, _numberOfCutCards) {}

    event DealtPlayerCard(address player, uint8 cardNumber, uint8 cardSuit);
    event DealtDealerCard(uint8 cardNumber, uint8 cardSuit);
    event DealerRevealedCard(uint8 cardNumber, uint8 cardSuit);
    event DealerBust(uint8 dealerCardsTotal, uint8 dealerCardCount);
    event DealerBlackJack(uint48 timestamp);
    event DealerStand(uint8 dealerCardsTotal, uint8 dealerCardCount);
    event PlayerWin(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 dealerCardsTotal
    );
    event PlayerBust(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerLost(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerPush(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerHit(address player, uint8 cardNumber, uint8 cardSuit);
    event PlayerDoubleDown(address player, uint8 cardNumber, uint8 cardSuit);
    event PlayerStand(
        address player,
        uint8 playerCardsTotal,
        uint8 playerCardCount
    );
    event PlayerBlackJack(address player);
    event PlayerSplit(
        address player,
        uint8 cardNumber,
        uint8 cardSuit1,
        uint8 cardSuit2
    );

    struct PlayerCard {
        Card card;
        uint8 splitNumber;
    }

    struct Player {
        bool atTable;
        uint48 bet;
        PlayerCard[] cards;
        uint8 splitNumber;
        bool finishedActing;
    }

    struct Dealer {
        Card[] cards;
        bool revealed;
    }

    uint48 bettingPeriod = 60 * 10;
    uint48 lastHandTime;
    address actingPlayer;
    uint48 playerActionPeriod = 60 * 5;
    uint48 lastPlayerActionTime;
    uint8 playersBet;

    mapping(address => Player) public players;

    address[] public playerAddresses;

    Dealer public dealer;
    Card dealerUnrevealed;

    modifier turnToAct() {
        require(
            msg.sender == actingPlayer ||
                block.timestamp - lastPlayerActionTime + playerActionPeriod > 0,
            "It is not your turn to act"
        );
        if (msg.sender != actingPlayer) {
            for (uint8 i = 0; i < playerAddresses.length; i++) {
                if (playerAddresses[i] == actingPlayer) {
                    if (i == playerAddresses.length - 1) {
                        actingPlayer = playerAddresses[0];
                    } else {
                        actingPlayer = playerAddresses[i + 1];
                    }
                    break;
                }
            }
        }
        require(msg.sender == actingPlayer, "It is not your turn to act");
        _;
    }
    modifier onlyPlayers() {
        require(players[msg.sender].atTable, "You are not at the table");
        _;
    }

    function joinTable() public onlyMembers {
        require(
            !players[msg.sender].atTable,
            "You are already sitting at the table."
        );
        players[msg.sender].atTable = true;
        playerAddresses.push(msg.sender);
        seedsViewed++;
    }

    function leaveTable() public onlyPlayers {
        if (players[msg.sender].bet > 0) playersBet--;
        players[msg.sender].atTable = false;
        for (uint i = 0; i < playerAddresses.length; i++) {
            if (playerAddresses[i] == msg.sender) {
                delete playerAddresses[i];
            }
        }
        if (actingPlayer == msg.sender) {
            actingPlayer = address(0);
            if (playersBet == playerAddresses.length) {
                dealerTurn();
            } else {
                for (uint8 i = 0; i < playerAddresses.length; i++) {
                    if (players[playerAddresses[i]].bet > 0 && !players[playerAddresses[i]].finishedActing) {
                        actingPlayer = playerAddresses[i];
                        break;
                    }
                }
                if (actingPlayer == address(0)) dealerTurn();
            }
        }
        seedsViewed++;
    }

    function bet(uint48 amount) public onlyPlayers {
        require(players[msg.sender].bet == 0, "You have already bet");
        require(dealer.revealed, "The round has already started.");
        require(
            playersBet < 255,
            "The maximum number of players has been reached"
        );
        takeChips(msg.sender, amount);
        players[msg.sender].bet = amount;
        playersBet++;
        if (playersBet == playerAddresses.length || playersBet == 255) {
            dealCards();
        }
        seedsViewed++;
    }

    function startTheHand() public onlyMembers {
        require(
            block.timestamp - lastHandTime + bettingPeriod > 0,
            "The betting period has not ended"
        );
        require(
            !dealer.revealed,
            "The dealer has not revealed their cards yet. Wait until the round ends."
        );
        require(playersBet > 0, "No one has bet yet");
        dealCards();
    }

    function moveToNextPlayer() public onlyMembers {
        require(msg.sender != actingPlayer, "It is your turn to act.");
        require(
            dealer.revealed,
            "The dealer has already revealed their cards."
        );
        require(
            block.timestamp - lastPlayerActionTime + playerActionPeriod > 0,
            "Wait until the player has had enough time to act."
        );
        if (msg.sender != actingPlayer) {
            for (uint8 i = 0; i < playerAddresses.length; i++) {
                if (playerAddresses[i] == actingPlayer) {
                    emit PlayerLost(
                        playerAddresses[i],
                        players[playerAddresses[i]].bet,
                        playerCardsTotal(players[playerAddresses[i]].cards, 0),
                        uint8(players[playerAddresses[i]].cards.length)
                    );
                    players[actingPlayer].finishedActing = true;
                    players[actingPlayer].bet = 0;
                    if (i == playerAddresses.length - 1) {
                        actingPlayer = address(0);
                    } else {
                        actingPlayer = playerAddresses[i + 1];
                    }
                    break;
                }
            }
        }
        if (actingPlayer == address(0)) {
            dealerTurn();
        }
    }

    function rotatePlaces() internal {
        address c = playerAddresses[0];
        for (uint i = 0; i < playerAddresses.length - 1; i++) {
            playerAddresses[i] = i == playerAddresses.length - 1
                ? c
                : playerAddresses[i + 1];
        }
    }

    function dealCards() internal {
        seedsViewed++;
        if (totalCards - (12 + playerAddresses.length * 12) < 1) shuffleDeck(numberOfCutCards);
        if (totalCards - (12 + playerAddresses.length * 12) < 1) revert("Not enough cards in the deck");
        rotatePlaces();
        delete dealer.cards;
        dealer.revealed = false;
        for (uint i = 0; i < playerAddresses.length; i++) {
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
        for (uint i = 0; i < playerAddresses.length; i++) {
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
        for (uint i; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].bet > 0) {
                uint8 cardTotal;
                for (
                    uint j = 0;
                    j < players[playerAddresses[i]].cards.length;
                    j++
                ) {
                    cardTotal += players[playerAddresses[i]]
                        .cards[j]
                        .card
                        .number;
                }
                if (dealerBlackjack) {
                    if (
                        (players[playerAddresses[i]].cards[0].card.number ==
                            1 &&
                            players[playerAddresses[i]].cards[1].card.number >=
                            10) ||
                        (players[playerAddresses[i]].cards[0].card.number >=
                            10 &&
                            players[playerAddresses[i]].cards[1].card.number ==
                            1)
                    ) {
                        emit PlayerPush(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                        payout(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet
                        );
                    } else {
                        emit PlayerLost(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                    }
                    players[playerAddresses[i]].finishedActing = true;
                    players[playerAddresses[i]].bet = 0;
                } else {
                    if (
                        (players[playerAddresses[i]].cards[0].card.number ==
                            1 &&
                            players[playerAddresses[i]].cards[1].card.number >=
                            10) ||
                        (players[playerAddresses[i]].cards[0].card.number >=
                            10 &&
                            players[playerAddresses[i]].cards[1].card.number ==
                            1)
                    ) {
                        emit PlayerBlackJack(playerAddresses[i]);
                        uint48 winnings = (players[playerAddresses[i]].bet *
                            3) / 2;
                        payout(playerAddresses[i], winnings);
                        emit PlayerWin(
                            playerAddresses[i],
                            winnings,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                        players[playerAddresses[i]].bet = 0;
                        players[playerAddresses[i]].finishedActing = true;
                    } else if (actingPlayer != address(0)) {
                        actingPlayer = playerAddresses[i];
                        lastPlayerActionTime = uint48(block.timestamp);
                    }
                }
            }
        }
    }

    function cardsTotal(Card[] memory cards)
        internal
        pure
        returns (uint8 cardTotal)
    {
        uint8 aceCount;
        for (uint256 i = 0; i < cards.length; i++) {
            if (cards[i].number == 1) {
                aceCount++;
            } else {
                cardTotal += cards[i].number < 10 ? cards[i].number : 10;
            }
        }
        if (aceCount > 0) {
            for (uint8 i = aceCount; i >= 0; i--) {
                if (cardTotal + 11 <= 21) {
                    cardTotal += 11;
                } else {
                    cardTotal += 1;
                }
            }
        }
    }

    function playerCardsTotal(PlayerCard[] memory cards, uint8 splitToPlay)
        internal
        pure
        returns (uint8 cardTotal)
    {
        uint8 aceCount;
        for (uint256 i = 0; i < cards.length; i++) {
            if (cards[i].splitNumber == splitToPlay) {
                if (cards[i].card.number == 1) {
                    aceCount++;
                } else {
                    cardTotal += cards[i].card.number < 10
                        ? cards[i].card.number
                        : 10;
                }
            }
        }
        if (aceCount > 0) {
            for (uint8 i = aceCount; i >= 0; i--) {
                if (cardTotal + 11 <= 21) {
                    cardTotal += 11;
                } else {
                    cardTotal += 1;
                }
            }
        }
    }
    function cardsOfSplit(PlayerCard[] memory cards, uint8 splitToPlay) internal pure returns (uint8 count) {
        for (uint256 i = 0; i < cards.length; i++) {
            if (cards[i].splitNumber == splitToPlay) {
                count++;
            }
        }
    }

    function dealerTurn() internal {
        dealer.revealed = true;
        emit DealerRevealedCard(dealerUnrevealed.number, dealerUnrevealed.suit);
        dealer.cards.push(dealerUnrevealed);
        uint8 dealerCardTotal = cardsTotal(dealer.cards);
        if (dealerCardTotal >= 17) {
            emit DealerStand(dealerCardTotal, uint8(dealer.cards.length));
        }
        while (dealerCardTotal < 17) {
            Card memory next = nextCard();
            dealer.cards.push(next);
            dealerCardTotal = cardsTotal(dealer.cards);
        }
        if (dealerCardTotal > 21) {
            emit DealerBust(dealerCardTotal, uint8(dealer.cards.length));
        } else {
            emit DealerStand(dealerCardTotal, uint8(dealer.cards.length));
        }
        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].bet > 0) {
                uint8 cardTotal = playerCardsTotal(
                    players[playerAddresses[i]].cards,
                    0
                );
                if (dealerCardTotal > 21) {
                    uint48 winnings = players[playerAddresses[i]].bet * 2;
                    payout(playerAddresses[i], winnings);
                    emit PlayerWin(
                        playerAddresses[i],
                        winnings,
                        cardTotal,
                        uint8(players[playerAddresses[i]].cards.length)
                    );
                } else {
                    if (cardTotal > dealerCardTotal) {
                        uint48 winnings = players[playerAddresses[i]].bet * 2;
                        payout(playerAddresses[i], winnings);
                        emit PlayerWin(
                            playerAddresses[i],
                            winnings,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                    } else if (cardTotal == dealerCardTotal) {
                        payout(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet
                        );
                        emit PlayerPush(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                    } else {
                        emit PlayerLost(
                            playerAddresses[i],
                            players[playerAddresses[i]].bet,
                            cardTotal,
                            uint8(players[playerAddresses[i]].cards.length)
                        );
                    }
                }
                players[playerAddresses[i]].bet = 0;
            }
        }
        lastHandTime = uint48(block.timestamp);
        playersBet = 0;
    }

    function hit(uint8 splitToPlay) public onlyMembers turnToAct {
        Card memory next = nextCard();
        require(
            splitToPlay >= players[msg.sender].splitNumber,
            "Invalid split"
        );
        players[msg.sender].splitNumber = splitToPlay;
        players[msg.sender].cards.push(
            PlayerCard({card: next, splitNumber: splitToPlay})
        );
        emit DealtPlayerCard(msg.sender, next.number, next.suit);
        emit PlayerHit(msg.sender, next.number, next.suit);
        uint8 cardTotal = playerCardsTotal(
            players[msg.sender].cards,
            splitToPlay
        );
        if (cardTotal == 21) {
            players[msg.sender].finishedActing = true;
        } else if (cardTotal > 21) {
            emit PlayerBust(
                msg.sender,
                players[msg.sender].bet,
                cardTotal,
                uint8(players[msg.sender].cards.length)
            );
            players[msg.sender].finishedActing = true;
            actingPlayer = address(0);
            players[msg.sender].bet = 0;
            for (uint8 i = 0; i < playerAddresses.length; i++) {
                if (players[playerAddresses[i]].bet > 0 && !players[playerAddresses[i]].finishedActing) {
                    actingPlayer = playerAddresses[i];
                    break;
                }
            }
            if (actingPlayer == address(0)) {
                dealerTurn();
            }
        }
        seedsViewed++;
    }

    function stand() public onlyMembers turnToAct {
        players[msg.sender].finishedActing = true;
        actingPlayer = address(0);
        for (uint8 i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].bet > 0 && !players[playerAddresses[i]].finishedActing) {
                actingPlayer = playerAddresses[i];
                break;
            }
        }
        if (actingPlayer == address(0)) {
            dealerTurn();
        }
        seedsViewed++;
    }

    function doubleDown() public onlyMembers turnToAct {
        seedsViewed++;
    }

    function split() public onlyMembers turnToAct {
        seedsViewed++;
    }
}
