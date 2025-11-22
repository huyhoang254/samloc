const { COMBO_TYPES, MIN_STRAIGHT_LENGTH, CARD_VALUES } = require('../utils/constants');

/**
 * Validator class for checking card combinations and moves
 */
class Validator {
  /**
   * Identify the type and value of a card combination
   * @param {Array} cards - Array of Card objects
   * @returns {Object|null} {type, value, cards} or null if invalid
   */
  static identifyCombo(cards) {
    if (!cards || cards.length === 0) return null;

    // Sort cards by value
    const sorted = [...cards].sort((a, b) => a.value - b.value);

    // Single card
    if (sorted.length === 1) {
      return {
        type: COMBO_TYPES.SINGLE,
        value: sorted[0].value,
        cards: sorted
      };
    }

    // Pair (2 cards same rank)
    if (sorted.length === 2) {
      if (sorted[0].value === sorted[1].value) {
        return {
          type: COMBO_TYPES.PAIR,
          value: sorted[0].value,
          cards: sorted
        };
      }
      return null;
    }

    // Triple/Sám (3 cards same rank)
    if (sorted.length === 3) {
      if (sorted[0].value === sorted[1].value && sorted[1].value === sorted[2].value) {
        return {
          type: COMBO_TYPES.TRIPLE,
          value: sorted[0].value,
          cards: sorted
        };
      }
      // Could be a straight of 3
      if (this.isStraight(sorted)) {
        return {
          type: COMBO_TYPES.STRAIGHT,
          value: sorted[sorted.length - 1].value,
          length: sorted.length,
          cards: sorted
        };
      }
      return null;
    }

    // Quad/Tứ quý (4 cards same rank)
    if (sorted.length === 4) {
      if (sorted[0].value === sorted[1].value && 
          sorted[1].value === sorted[2].value && 
          sorted[2].value === sorted[3].value) {
        return {
          type: COMBO_TYPES.QUAD,
          value: sorted[0].value,
          cards: sorted
        };
      }
      // Could be a straight of 4
      if (this.isStraight(sorted)) {
        return {
          type: COMBO_TYPES.STRAIGHT,
          value: sorted[sorted.length - 1].value,
          length: sorted.length,
          cards: sorted
        };
      }
      return null;
    }

    // Straight/Sảnh (3+ consecutive cards)
    if (sorted.length >= MIN_STRAIGHT_LENGTH) {
      if (this.isStraight(sorted)) {
        return {
          type: COMBO_TYPES.STRAIGHT,
          value: sorted[sorted.length - 1].value,
          length: sorted.length,
          cards: sorted
        };
      }
      return null;
    }

    return null;
  }

  /**
   * Check if cards form a straight (consecutive values)
   * @param {Array} sortedCards - Sorted array of cards
   * @returns {boolean}
   */
  static isStraight(sortedCards) {
    if (sortedCards.length < MIN_STRAIGHT_LENGTH) return false;

    // Check for consecutive values
    for (let i = 1; i < sortedCards.length; i++) {
      if (sortedCards[i].value !== sortedCards[i - 1].value + 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if combo1 can beat combo2
   * @param {Object} combo1 - The combo trying to beat
   * @param {Object} combo2 - The combo to beat
   * @returns {boolean}
   */
  static canBeat(combo1, combo2) {
    if (!combo1 || !combo2) return false;

    // Must be same type
    if (combo1.type !== combo2.type) {
      // Exception: Quad can beat a 2 (in some rules)
      // For now, strict type matching
      return false;
    }

    // For singles, pairs, triples, quads: compare values
    if (combo1.type === COMBO_TYPES.SINGLE || 
        combo1.type === COMBO_TYPES.PAIR || 
        combo1.type === COMBO_TYPES.TRIPLE || 
        combo1.type === COMBO_TYPES.QUAD) {
      return combo1.value > combo2.value;
    }

    // For straights: first compare length, then value
    if (combo1.type === COMBO_TYPES.STRAIGHT) {
      if (combo1.length > combo2.length) {
        return true;
      }
      if (combo1.length === combo2.length) {
        return combo1.value > combo2.value;
      }
      return false;
    }

    return false;
  }

  /**
   * Check if a player's hand contains cards they claim to play
   * @param {Array} hand - Player's hand
   * @param {Array} cards - Cards to play
   * @returns {boolean}
   */
  static hasCards(hand, cards) {
    const handCopy = [...hand];
    
    for (const card of cards) {
      const index = handCopy.findIndex(c => 
        c.rank === card.rank && c.suit === card.suit
      );
      if (index === -1) return false;
      handCopy.splice(index, 1);
    }
    
    return true;
  }

  /**
   * Remove cards from hand
   * @param {Array} hand - Player's hand
   * @param {Array} cards - Cards to remove
   * @returns {Array} New hand without the cards
   */
  static removeCards(hand, cards) {
    const newHand = [...hand];
    
    for (const card of cards) {
      const index = newHand.findIndex(c => 
        c.rank === card.rank && c.suit === card.suit
      );
      if (index !== -1) {
        newHand.splice(index, 1);
      }
    }
    
    return newHand;
  }

  /**
   * Check for auto-win conditions
   * @param {Array} hand - Player's hand (10 cards)
   * @returns {Object|null} {condition, description} or null
   */
  static checkAutoWin(hand) {
    if (hand.length !== 10) return null;

    // Check for straight of 10 (Sảnh rồng)
    const sorted = [...hand].sort((a, b) => a.value - b.value);
    if (this.isStraight(sorted)) {
      return {
        condition: 'straight_10',
        description: 'Sảnh rồng - 10 lá liên tiếp'
      };
    }

    // Group by rank
    const rankGroups = {};
    for (const card of hand) {
      if (!rankGroups[card.rank]) {
        rankGroups[card.rank] = [];
      }
      rankGroups[card.rank].push(card);
    }

    // Check for quad of 2s (Tứ quý 2)
    if (rankGroups['2'] && rankGroups['2'].length === 4) {
      return {
        condition: 'quad_2',
        description: 'Tứ quý 2'
      };
    }

    // Check for 5 pairs (5 đôi)
    const pairs = Object.values(rankGroups).filter(group => group.length === 2);
    if (pairs.length === 5) {
      return {
        condition: 'five_pairs',
        description: '5 đôi'
      };
    }

    // Check for 3 triples (3 sám cô)
    const triples = Object.values(rankGroups).filter(group => group.length === 3);
    if (triples.length === 3) {
      return {
        condition: 'three_triples',
        description: '3 sám cô'
      };
    }

    return null;
  }
}

module.exports = Validator;
