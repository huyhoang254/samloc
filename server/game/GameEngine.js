const Deck = require('./Deck');
const Validator = require('./Validator');
const ScoreCalculator = require('./ScoreCalculator');
const { 
  GAME_STATES, 
  CARDS_PER_PLAYER,
  PLAYER_STATES,
  TURN_TIMEOUT 
} = require('../utils/constants');

/**
 * GameEngine - Main game logic controller
 */
class GameEngine {
  constructor(roomId, players, options = {}) {
    this.roomId = roomId;
    this.players = {}; // { playerId: { id, name, hand, totalScore, state, ... } }
    this.playerOrder = []; // Order of play
    this.currentPlayerIndex = 0;
    this.state = GAME_STATES.WAITING;
    this.deck = new Deck();
    this.currentCombo = null; // Current combo on the table
    this.lastComboPlayer = null;
    this.samDeclarer = null; // Player who declared Sam
    this.winner = null;
    this.turnHistory = []; // History of all plays
    this.passCount = 0; // Count of consecutive passes
    this.options = {
      betAmount: options.betAmount || 0,
      timePerTurn: options.timePerTurn || TURN_TIMEOUT,
      ...options
    };

    // Initialize players
    players.forEach(player => {
      this.players[player.id] = {
        id: player.id,
        name: player.name,
        hand: [],
        totalScore: player.totalScore || 0,
        state: PLAYER_STATES.WAITING,
        cardsPlayed: 0,
        lastMove: null,
        declaredOne: false
      };
      this.playerOrder.push(player.id);
    });
  }

  /**
   * Start a new game
   */
  startGame() {
    this.state = GAME_STATES.DECLARING_SAM;
    this.dealCards();
    
    // Check for auto-win conditions
    for (const playerId in this.players) {
      const player = this.players[playerId];
      const autoWin = Validator.checkAutoWin(player.hand);
      if (autoWin) {
        return {
          success: true,
          autoWin: true,
          winner: playerId,
          condition: autoWin,
          hands: this.getPlayerHands()
        };
      }
    }

    return {
      success: true,
      state: this.state,
      hands: this.getPlayerHands(),
      firstPlayer: this.findFirstPlayer()
    };
  }

  /**
   * Deal cards to all players
   */
  dealCards() {
    const hands = this.deck.deal(this.playerOrder.length, CARDS_PER_PLAYER);
    
    this.playerOrder.forEach((playerId, index) => {
      this.players[playerId].hand = hands[index];
      this.players[playerId].state = PLAYER_STATES.PLAYING;
    });
  }

  /**
   * Find the first player (player with lowest card)
   */
  findFirstPlayer() {
    let firstPlayerId = null;
    let lowestValue = Infinity;

    for (const playerId in this.players) {
      const player = this.players[playerId];
      if (player.hand.length > 0) {
        const lowestCard = player.hand[0]; // Hand is already sorted
        if (lowestCard.value < lowestValue) {
          lowestValue = lowestCard.value;
          firstPlayerId = playerId;
        }
      }
    }

    this.currentPlayerIndex = this.playerOrder.indexOf(firstPlayerId);
    return firstPlayerId;
  }

  /**
   * Declare Sam (player claims they will win)
   */
  declareSam(playerId) {
    if (this.state !== GAME_STATES.DECLARING_SAM) {
      return { success: false, error: 'Not in declaring phase' };
    }

    if (!this.players[playerId]) {
      return { success: false, error: 'Player not found' };
    }

    if (this.samDeclarer) {
      return { success: false, error: 'Sam already declared by another player' };
    }

    this.samDeclarer = playerId;
    this.state = GAME_STATES.PLAYING;

    return {
      success: true,
      declarer: playerId,
      declarerName: this.players[playerId].name
    };
  }

  /**
   * Skip Sam declaration and start playing
   */
  skipSamDeclaration() {
    this.state = GAME_STATES.PLAYING;
    return { success: true };
  }

  /**
   * Play cards
   */
  playCards(playerId, cards) {
    // Validate turn
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.players[playerId];

    // Validate cards are in hand
    if (!Validator.hasCards(player.hand, cards)) {
      return { success: false, error: 'Cards not in hand' };
    }

    // Identify combo
    const combo = Validator.identifyCombo(cards);
    if (!combo) {
      return { success: false, error: 'Invalid card combination' };
    }

    // Check if can beat current combo
    if (this.currentCombo && !Validator.canBeat(combo, this.currentCombo)) {
      return { success: false, error: 'Cannot beat current combo' };
    }

    // Remove cards from hand
    player.hand = Validator.removeCards(player.hand, cards);
    player.cardsPlayed += cards.length;
    player.lastMove = { combo, cards, timestamp: Date.now() };

    // Update game state
    this.currentCombo = combo;
    this.lastComboPlayer = playerId;
    this.passCount = 0;

    // Add to history
    this.turnHistory.push({
      playerId,
      playerName: player.name,
      combo,
      cards,
      timestamp: Date.now()
    });

    // Check if player won
    if (player.hand.length === 0) {
      return this.endGame(playerId);
    }

    // Check if player should declare one
    if (player.hand.length === 1 && !player.declaredOne) {
      return {
        success: true,
        combo,
        cardsLeft: 1,
        needDeclareOne: true,
        nextPlayer: this.getNextPlayer()
      };
    }

    // Move to next player
    this.nextTurn();

    return {
      success: true,
      combo,
      cardsLeft: player.hand.length,
      currentCombo: this.currentCombo,
      nextPlayer: this.getCurrentPlayer()
    };
  }

  /**
   * Pass turn
   */
  passTurn(playerId) {
    if (!this.isPlayerTurn(playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    // Cannot pass if no combo on table (must play)
    if (!this.currentCombo) {
      return { success: false, error: 'Cannot pass, must play' };
    }

    this.passCount++;

    // Add to history
    this.turnHistory.push({
      playerId,
      playerName: this.players[playerId].name,
      action: 'pass',
      timestamp: Date.now()
    });

    // If all other players passed, current combo player wins the round
    if (this.passCount >= this.playerOrder.length - 1) {
      this.currentCombo = null;
      this.passCount = 0;
      this.currentPlayerIndex = this.playerOrder.indexOf(this.lastComboPlayer);
      
      return {
        success: true,
        roundWinner: this.lastComboPlayer,
        roundWinnerName: this.players[this.lastComboPlayer].name,
        message: 'Won the round, play again',
        nextPlayer: this.lastComboPlayer
      };
    }

    // Move to next player
    this.nextTurn();

    return {
      success: true,
      nextPlayer: this.getCurrentPlayer()
    };
  }

  /**
   * Declare one (báo 1)
   */
  declareOne(playerId) {
    const player = this.players[playerId];
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.hand.length !== 1) {
      return { success: false, error: 'Must have exactly 1 card' };
    }

    player.declaredOne = true;

    return {
      success: true,
      playerId,
      playerName: player.name
    };
  }

  /**
   * End the game
   */
  endGame(winnerId) {
    this.state = GAME_STATES.ENDED;
    this.winner = winnerId;

    // Calculate scores
    const scores = this.options.betAmount > 0
      ? ScoreCalculator.calculateBetScores(this, this.options.betAmount)
      : ScoreCalculator.calculateScores(this);

    // Update player total scores
    for (const playerId in scores) {
      this.players[playerId].totalScore = scores[playerId].totalScore;
    }

    return {
      success: true,
      gameEnded: true,
      winner: winnerId,
      winnerName: this.players[winnerId].name,
      scores,
      samDeclarer: this.samDeclarer,
      finalHands: this.getPlayerHands()
    };
  }

  /**
   * Check if it's a player's turn
   */
  isPlayerTurn(playerId) {
    return this.playerOrder[this.currentPlayerIndex] === playerId;
  }

  /**
   * Move to next player's turn
   */
  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
  }

  /**
   * Get current player ID
   */
  getCurrentPlayer() {
    return this.playerOrder[this.currentPlayerIndex];
  }

  /**
   * Get next player ID
   */
  getNextPlayer() {
    const nextIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    return this.playerOrder[nextIndex];
  }

  /**
   * Get hands for each player (for private sending)
   */
  getPlayerHands() {
    const hands = {};
    for (const playerId in this.players) {
      hands[playerId] = this.players[playerId].hand;
    }
    return hands;
  }

  /**
   * Get public game state (without hidden info)
   */
  getPublicState() {
    const publicPlayers = {};
    
    for (const playerId in this.players) {
      const player = this.players[playerId];
      publicPlayers[playerId] = {
        id: player.id,
        name: player.name,
        cardCount: player.hand.length,
        totalScore: player.totalScore,
        state: player.state,
        declaredOne: player.declaredOne
      };
    }

    return {
      roomId: this.roomId,
      state: this.state,
      players: publicPlayers,
      playerOrder: this.playerOrder,
      currentPlayer: this.getCurrentPlayer(),
      currentCombo: this.currentCombo,
      lastComboPlayer: this.lastComboPlayer,
      samDeclarer: this.samDeclarer,
      turnHistory: this.turnHistory.slice(-10), // Last 10 moves
      winner: this.winner
    };
  }

  /**
   * Get full state for a specific player
   */
  getPlayerState(playerId) {
    return {
      ...this.getPublicState(),
      hand: this.players[playerId]?.hand || []
    };
  }
}

module.exports = GameEngine;
