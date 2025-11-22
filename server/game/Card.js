const { CARD_VALUES, SUITS } = require('../utils/constants');

/**
 * Card class representing a playing card
 */
class Card {
  constructor(rank, suit) {
    this.rank = rank;  // '3', '4', ..., 'K', 'A', '2'
    this.suit = suit;  // 'hearts', 'diamonds', 'clubs', 'spades'
    this.value = CARD_VALUES[rank];
  }

  /**
   * Get card display string
   */
  toString() {
    return `${this.rank}${this.suit.charAt(0).toUpperCase()}`;
  }

  /**
   * Compare two cards by value
   */
  static compare(card1, card2) {
    return card1.value - card2.value;
  }

  /**
   * Create card from string (e.g., "3H" -> Card(3, hearts))
   */
  static fromString(str) {
    const rank = str.slice(0, -1);
    const suitChar = str.slice(-1).toLowerCase();
    const suitMap = { 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades' };
    return new Card(rank, suitMap[suitChar]);
  }

  /**
   * Convert to JSON-friendly object
   */
  toJSON() {
    return {
      rank: this.rank,
      suit: this.suit,
      value: this.value
    };
  }
}

module.exports = Card;
