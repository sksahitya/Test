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

    event DealtPlayerCard(
        address player,
        uint8 cardNumber,
        uint8 cardSuit,
        uint8 splitNumber
    );
    event DealtDealerCard(uint8 cardNumber, uint8 cardSuit);
    event DealerRevealedCard(uint8 cardNumber, uint8 cardSuit);
    event DealerBust(uint8 dealerCardsTotal, uint8 dealerCardCount);
    event DealerBlackJack(uint48 timestamp);
    event DealerStand(uint8 dealerCardsTotal, uint8 dealerCardCount);
    event PlayerWin(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 dealerCardsTotal,
        uint8 splitNumber
    );
    event PlayerBust(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount,
        uint8 splitNumber
    );
    event PlayerLost(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount,
        uint8 splitNumber
    );
    event PlayerPush(
        address player,
        uint48 amount,
        uint8 playerCardsTotal,
        uint8 playerCardCount,
        uint8 splitNumber
    );
    event PlayerHit(
        address player,
        uint8 cardNumber,
        uint8 cardSuit,
        uint8 splitNumber
    );
    event PlayerDoubleDown(
        address player,
        uint48 amount,
        uint8 cardNumber,
        uint8 cardSuit
    );
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
        uint8 cardSuit2,
        uint8 splitNumber
    );
    uint48 public bettingPeriod = 60 * 10;
    uint48 public lastHandTime;
    address public actingPlayer;
    uint48 public playerActionPeriod = 60 * 5;
    uint48 public lastPlayerActionTime;
    uint8 public playersBet;
    mapping(address => Player) public players;
    address[] public playerAddresses;
    Dealer public dealer;
    Card dealerUnrevealed;

    struct PlayerCard {
        Card card;
        uint8 splitNumber;
    }

    struct Player {
        bool atTable;
        uint48 bet;
        PlayerCard[] cards;
        bool doubledDown;
        bool split;
        uint8 highestSplitNumber;
        uint8 splitNumber;
        bool finishedActing;
    }

    struct Dealer {
        Card[] cards;
        bool revealed;
    }

    modifier turnToAct() {
        require(
            msg.sender == actingPlayer ||
                block.timestamp - lastPlayerActionTime + playerActionPeriod > 0,
            "It is not your turn to act"
        );
        if (msg.sender != actingPlayer) {
            for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
                if (playerAddresses[i] == actingPlayer) {
                    if (i == playerAddresses.length - 1) {
                        actingPlayer = address(0);
                    } else {
                        actingPlayer = playerAddresses[i + 1];
                    }
                    break;
                }
            }
            require(msg.sender == actingPlayer, "It is not your turn to act");
            if (actingPlayer == address(0)) {
                dealerTurn();
            }
        }
        _;
    }
    modifier onlyPlayers() {
        require(players[msg.sender].atTable, "You are not at the table");
        _;
    }

    function setTimePeriods(uint48 _bettingPeriod, uint48 _playerActionPeriod)
        external
        onlyOwner
    {
        bettingPeriod = _bettingPeriod;
        playerActionPeriod = _playerActionPeriod;
    }

    function setDeckParameters(uint8 _numberOfDecks, uint16 _numberOfCutCards)
        external
        onlyOwner
    {
        numberOfDecks = _numberOfDecks;
        numberOfCutCards = _numberOfCutCards;
    }

    function joinTable() public onlyMembers {
        require(
            !players[msg.sender].atTable,
            "You are already sitting at the table."
        );
        require(playerAddresses.length < 255, "The table is full.");
        players[msg.sender].atTable = true;
        playerAddresses.push(msg.sender);
        seedsViewed++;
    }

    function leaveTable() public onlyPlayers {
        if (players[msg.sender].bet > 0) {
            playersBet--;
        }
        players[msg.sender].atTable = false;
        for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
            if (playerAddresses[i] == msg.sender) {
                delete playerAddresses[i];
            }
        }
        if (actingPlayer == msg.sender) {
            actingPlayer = address(0);
            if (playersBet == playerAddresses.length) {
                dealerTurn();
            } else {
                for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
                    if (
                        players[playerAddresses[i]].bet > 0 &&
                        !players[playerAddresses[i]].finishedActing
                    ) {
                        actingPlayer = playerAddresses[i];
                        break;
                    }
                }
                if (actingPlayer == address(0)) dealerTurn();
            }
        }
        seedsViewed++;
    }

    function bet(uint48 amount) external onlyPlayers {
        require(players[msg.sender].bet == 0, "You have already bet");
        require(!dealer.revealed, "The round has already started.");
        takeChips(msg.sender, amount);
        players[msg.sender].bet = amount;
        playersBet++;
        if (playersBet == playerAddresses.length) {
            dealCards();
        }
        seedsViewed++;
    }

    function startTheHand() external onlyMembers {
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

    function moveToNextPlayer() external onlyMembers {
        require(msg.sender != actingPlayer, "It is your turn to act.");
        require(
            !dealer.revealed,
            "The dealer has already revealed their cards."
        );
        require(
            block.timestamp - lastPlayerActionTime + playerActionPeriod > 0,
            "Wait until the player has had enough time to act."
        );
        if (msg.sender != actingPlayer) {
            for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
                if (playerAddresses[i] == actingPlayer) {
                    emit PlayerLost(
                        playerAddresses[i],
                        players[playerAddresses[i]].bet,
                        playerCardsTotal(players[playerAddresses[i]].cards, 0),
                        uint8(players[playerAddresses[i]].cards.length),
                        players[playerAddresses[i]].highestSplitNumber
                    );
                    players[actingPlayer].finishedActing = true;
                    players[actingPlayer].bet = 0;
                    if (i == playerAddresses.length - 1) {
                        actingPlayer = address(0);
                    } else {
                        actingPlayer = playerAddresses[i + 1];
                        lastPlayerActionTime = uint48(block.timestamp);
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
        for (uint8 i = uint8(playerAddresses.length) - 1; i >= 0 ; i--) {
            playerAddresses[i] = i == uint8(playerAddresses.length) - 1
                ? c
                : playerAddresses[i];
        }
    }

    function dealCards() internal {
        seedsViewed++;
        if (totalCards - (12 + playerAddresses.length * 12) < 1) shuffleDeck(numberOfCutCards);
        require(totalCards - (12 + playerAddresses.length * 12) > 0);
        rotatePlaces();
        delete dealer.cards;
        dealer.revealed = false;
        for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
            delete players[playerAddresses[i]].cards;
            players[playerAddresses[i]].doubledDown = false;
            players[playerAddresses[i]].split = false;
            players[playerAddresses[i]].highestSplitNumber = 0;
            players[playerAddresses[i]].splitNumber = 0;
            players[playerAddresses[i]].finishedActing = false;
            if (players[playerAddresses[i]].bet > 0) {
                Card memory next = nextCard();
                players[playerAddresses[i]].cards.push(
                    PlayerCard({card: next, splitNumber: 0})
                );
                emit DealtPlayerCard(
                    playerAddresses[i],
                    next.number,
                    next.suit,
                    players[playerAddresses[i]].splitNumber
                );
            }
        }
        dealer.cards.push(nextCard());
        emit DealtDealerCard(dealer.cards[0].number, dealer.cards[0].suit);
        for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
            if (players[playerAddresses[i]].bet > 0) {
                Card memory next = nextCard();
                players[playerAddresses[i]].cards.push(
                    PlayerCard({card: next, splitNumber: 0})
                );
                emit DealtPlayerCard(
                    playerAddresses[i],
                    next.number,
                    next.suit,
                    players[playerAddresses[i]].splitNumber
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
        for (uint8 i; i < uint8(playerAddresses.length); i++) {
            if (players[playerAddresses[i]].bet > 0) {
                uint8 cardTotal;
                for (
                    uint8 j = 0;
                    j < uint8(players[playerAddresses[i]].cards.length);
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
                            uint8(players[playerAddresses[i]].cards.length),
                            players[playerAddresses[i]].splitNumber
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
                            uint8(players[playerAddresses[i]].cards.length),
                            players[playerAddresses[i]].splitNumber
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
                            uint8(players[playerAddresses[i]].cards.length),
                            players[playerAddresses[i]].splitNumber
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
        for (uint8 i = 0; i < uint8(cards.length); i++) {
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
        for (uint8 i = 0; i < uint8(cards.length); i++) {
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

    function cardsOfSplit(PlayerCard[] memory cards, uint8 splitToPlay)
        internal
        pure
        returns (uint8 count)
    {
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
        for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
            if (players[playerAddresses[i]].bet > 0) {
                for (
                    uint8 z = 0;
                    z < players[playerAddresses[i]].splitNumber;
                    z++
                ) {
                    uint8 cardTotal = playerCardsTotal(
                        players[playerAddresses[i]].cards,
                        z
                    );
                    uint8 splitCardCount = cardsOfSplit(
                        players[playerAddresses[i]].cards,
                        z
                    );
                    if (dealerCardTotal > 21) {
                        uint48 winnings = players[playerAddresses[i]].split
                            ? (players[playerAddresses[i]].bet /
                                players[playerAddresses[i]].splitNumber) * 2
                            : players[playerAddresses[i]].bet * 2;
                        payout(playerAddresses[i], winnings);
                        emit PlayerWin(
                            playerAddresses[i],
                            winnings,
                            cardTotal,
                            splitCardCount,
                            z
                        );
                    } else {
                        if (cardTotal > dealerCardTotal) {
                            uint48 winnings = players[playerAddresses[i]].split
                                ? (players[playerAddresses[i]].bet /
                                    players[playerAddresses[i]].splitNumber) * 2
                                : players[playerAddresses[i]].bet * 2;
                            payout(playerAddresses[i], winnings);
                            emit PlayerWin(
                                playerAddresses[i],
                                winnings,
                                cardTotal,
                                splitCardCount,
                                z
                            );
                        } else if (cardTotal == dealerCardTotal) {
                            payout(
                                playerAddresses[i],
                                players[playerAddresses[i]].split
                                    ? (players[playerAddresses[i]].bet /
                                        players[playerAddresses[i]].splitNumber)
                                    : players[playerAddresses[i]].bet
                            );
                            emit PlayerPush(
                                playerAddresses[i],
                                players[playerAddresses[i]].bet,
                                cardTotal,
                                splitCardCount,
                                z
                            );
                        } else {
                            emit PlayerLost(
                                playerAddresses[i],
                                players[playerAddresses[i]].bet,
                                cardTotal,
                                splitCardCount,
                                z
                            );
                        }
                    }
                }
                players[playerAddresses[i]].bet = 0;
            }
        }
        lastHandTime = uint48(block.timestamp);
        playersBet = 0;
    }

    function hit() external turnToAct {
        Card memory next = nextCard();
        players[msg.sender].cards.push(
            PlayerCard({
                card: next,
                splitNumber: players[msg.sender].splitNumber
            })
        );
        emit DealtPlayerCard(
            msg.sender,
            next.number,
            next.suit,
            players[msg.sender].splitNumber
        );
        emit PlayerHit(
            msg.sender,
            next.number,
            next.suit,
            players[msg.sender].splitNumber
        );
        uint8 cardTotal = playerCardsTotal(
            players[msg.sender].cards,
            players[msg.sender].splitNumber
        );
        if (cardTotal == 21) {
            if (
                players[msg.sender].splitNumber ==
                players[msg.sender].highestSplitNumber
            ) {
                players[msg.sender].finishedActing = true;
            } else {
                players[msg.sender].splitNumber++;
            }
        } else if (cardTotal > 21) {
            emit PlayerBust(
                msg.sender,
                players[msg.sender].bet,
                cardTotal,
                uint8(players[msg.sender].cards.length),
                players[msg.sender].splitNumber
            );
            players[msg.sender].finishedActing = true;
            players[msg.sender].bet = 0;
        }
        if (players[msg.sender].finishedActing) {
            actingPlayer = address(0);
            for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
                if (
                    players[playerAddresses[i]].bet > 0 &&
                    !players[playerAddresses[i]].finishedActing
                ) {
                    actingPlayer = playerAddresses[i];
                    lastPlayerActionTime = uint48(block.timestamp);
                    break;
                }
            }
            if (actingPlayer == address(0)) {
                dealerTurn();
            }
        } else {
            lastPlayerActionTime = uint48(block.timestamp);
        }
        seedsViewed++;
    }

    function stand() external turnToAct {
        if (
            players[msg.sender].splitNumber <
            players[msg.sender].highestSplitNumber
        ) {
            players[msg.sender].splitNumber++;
        } else {
            players[msg.sender].finishedActing = true;
            actingPlayer = address(0);
            for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
                if (
                    players[playerAddresses[i]].bet > 0 &&
                    !players[playerAddresses[i]].finishedActing
                ) {
                    actingPlayer = playerAddresses[i];
                    lastPlayerActionTime = uint48(block.timestamp);
                    break;
                }
            }
            if (actingPlayer == address(0)) {
                dealerTurn();
            }
        }
        seedsViewed++;
    }

    function doubleDown() external turnToAct {
        require(
            players[msg.sender].cards.length == 2,
            "You can only double down on your first two cards"
        );
        takeChips(msg.sender, players[msg.sender].bet);
        players[msg.sender].bet *= 2;
        players[msg.sender].doubledDown = true;
        Card memory next;
        next = nextCard();
        players[msg.sender].cards.push(
            PlayerCard({
                card: next,
                splitNumber: players[msg.sender].splitNumber
            })
        );
        emit PlayerDoubleDown(
            msg.sender,
            players[msg.sender].bet,
            next.number,
            next.suit
        );
        emit DealtPlayerCard(
            msg.sender,
            next.number,
            next.suit,
            players[msg.sender].splitNumber
        );
        players[msg.sender].finishedActing = true;
        actingPlayer = address(0);
        for (uint8 i = 0; i < uint8(playerAddresses.length); i++) {
            if (
                players[playerAddresses[i]].bet > 0 &&
                !players[playerAddresses[i]].finishedActing
            ) {
                actingPlayer = playerAddresses[i];
                lastPlayerActionTime = uint48(block.timestamp);
                break;
            }
        }
        if (actingPlayer == address(0)) {
            dealerTurn();
        }
        seedsViewed++;
    }

    function split() external turnToAct {
        uint8 cardNumber;
        uint8 cardSuit;
        takeChips(msg.sender, players[msg.sender].bet / players[msg.sender].highestSplitNumber);
        if (players[msg.sender].cards.length == 2) {
            for (uint8 i; i < uint8(players[msg.sender].cards.length); i++) {
                if (
                    (players[msg.sender].cards[i].splitNumber ==
                        players[msg.sender].splitNumber) &&
                    (cardNumber < 1 ||
                        (cardNumber ==
                            players[msg.sender].cards[i].card.number))
                ) {
                    if (cardNumber < 1) {
                        cardNumber = players[msg.sender].cards[i].card.number;
                        cardSuit = players[msg.sender].cards[i].card.suit;
                    } else {
                        players[msg.sender].split = true;
                        emit PlayerSplit(
                            msg.sender,
                            cardNumber,
                            cardSuit,
                            players[msg.sender].cards[i].card.suit,
                            players[msg.sender].splitNumber
                        );
                        Card memory next;
                        next = nextCard();
                        players[msg.sender].cards.push(
                            PlayerCard({
                                card: next,
                                splitNumber: players[msg.sender].splitNumber
                            })
                        );
                        emit DealtPlayerCard(
                            msg.sender,
                            next.number,
                            next.suit,
                            players[msg.sender].splitNumber
                        );
                        next = nextCard();
                        players[msg.sender].cards.push(
                            PlayerCard({
                                card: next,
                                splitNumber: players[msg.sender]
                                    .highestSplitNumber + 1
                            })
                        );
                        players[msg.sender].highestSplitNumber++;
                        emit DealtPlayerCard(
                            msg.sender,
                            next.number,
                            next.suit,
                            players[msg.sender].highestSplitNumber + 1
                        );
                        break;
                    }
                } else if (
                    players[msg.sender].cards[i].splitNumber ==
                    players[msg.sender].splitNumber
                ) {
                    cardNumber = 0;
                }
            }
        }
        require(cardNumber > 0 || players[msg.sender].split, "Invalid split");
        lastPlayerActionTime = uint48(block.timestamp);
        seedsViewed++;
    }
}
