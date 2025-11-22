const Card = require('./Card');
const { SUITS } = require('../utils/constants');

/**
 * Deck class for creating and shuffling cards
 */
class Deck {
  constructor() {
    this.cards = [];
    this.initializeDeck();
  }

  /**
   * Initialize a standard 52-card deck
   */
  initializeDeck() {
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    this.cards = [];
    
    for (const suit of SUITS) {
      for (const rank of ranks) {
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  /**
   * Shuffle the deck using Fisher-Yates algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal cards to players
   * @param {number} numPlayers - Number of players
   * @param {number} cardsPerPlayer - Cards per player
   * @returns {Array} Array of hands (each hand is an array of cards)
   */
  deal(numPlayers, cardsPerPlayer) {
    this.shuffle();
    const hands = [];
    
    for (let i = 0; i < numPlayers; i++) {
      const hand = [];
      for (let j = 0; j < cardsPerPlayer; j++) {
        hand.push(this.cards[i * cardsPerPlayer + j]);
      }
      // Sort hand by value
      hand.sort(Card.compare);
      hands.push(hand);
    }
    
    return hands;
  }

  /**
   * Get remaining cards count
   */
  getRemainingCount() {
    return this.cards.length;
  }
}

module.exports = Deck;
