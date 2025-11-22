const Validator = require('../game/Validator');
const { COMBO_TYPES } = require('../utils/constants');

/**
 * BotPlayer - AI player that makes automatic decisions
 */
class BotPlayer {
  constructor(botId, botName) {
    this.id = botId;
    this.name = botName;
    this.difficulty = 'medium'; // easy, medium, hard
  }

  /**
   * Decide whether to declare Sam
   */
  shouldDeclareSam(hand) {
    // Check for strong hands
    const autoWin = Validator.checkAutoWin(hand);
    if (autoWin) return true;

    // Count high cards (A, 2, K)
    const highCards = hand.filter(c => c.value >= 13).length;
    
    // Check for pairs and triples
    const rankGroups = this.groupByRank(hand);
    const pairs = Object.values(rankGroups).filter(g => g.length === 2).length;
    const triples = Object.values(rankGroups).filter(g => g.length === 3).length;

    // Declare if very strong hand
    return highCards >= 6 || pairs >= 3 || triples >= 2;
  }

  /**
   * Decide what cards to play
   */
  decideMove(hand, currentCombo, isFirstMove) {
    // If first move, play lowest cards
    if (isFirstMove || !currentCombo) {
      return this.playLowestCards(hand);
    }

    // Try to beat current combo
    return this.tryToBeatCombo(hand, currentCombo);
  }

  /**
   * Play lowest possible cards
   */
  playLowestCards(hand) {
    if (hand.length === 0) return null;

    // Try to play combinations first (get rid of more cards)
    const rankGroups = this.groupByRank(hand);
    
    // Try quad
    for (const rank in rankGroups) {
      if (rankGroups[rank].length === 4) {
        return rankGroups[rank];
      }
    }

    // Try triple
    for (const rank in rankGroups) {
      if (rankGroups[rank].length === 3) {
        return rankGroups[rank];
      }
    }

    // Try straight
    const straight = this.findLowestStraight(hand);
    if (straight) {
      return straight;
    }

    // Try pair
    for (const rank in rankGroups) {
      if (rankGroups[rank].length === 2) {
        return rankGroups[rank];
      }
    }

    // Play single lowest card
    return [hand[0]];
  }

  /**
   * Try to beat the current combo
   */
  tryToBeatCombo(hand, currentCombo) {
    if (!currentCombo) return null;

    const sortedHand = [...hand].sort((a, b) => a.value - b.value);

    switch (currentCombo.type) {
      case COMBO_TYPES.SINGLE:
        return this.findBeatingSingle(sortedHand, currentCombo.value);
      
      case COMBO_TYPES.PAIR:
        return this.findBeatingPair(sortedHand, currentCombo.value);
      
      case COMBO_TYPES.TRIPLE:
        return this.findBeatingTriple(sortedHand, currentCombo.value);
      
      case COMBO_TYPES.QUAD:
        return this.findBeatingQuad(sortedHand, currentCombo.value);
      
      case COMBO_TYPES.STRAIGHT:
        return this.findBeatingStraight(sortedHand, currentCombo);
      
      default:
        return null;
    }
  }

  /**
   * Find a single card that beats the value
   */
  findBeatingSingle(hand, value) {
    const card = hand.find(c => c.value > value);
    return card ? [card] : null;
  }

  /**
   * Find a pair that beats the value
   */
  findBeatingPair(hand, value) {
    const rankGroups = this.groupByRank(hand);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 2 && rankGroups[rank][0].value > value) {
        return rankGroups[rank].slice(0, 2);
      }
    }
    
    return null;
  }

  /**
   * Find a triple that beats the value
   */
  findBeatingTriple(hand, value) {
    const rankGroups = this.groupByRank(hand);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length >= 3 && rankGroups[rank][0].value > value) {
        return rankGroups[rank].slice(0, 3);
      }
    }
    
    return null;
  }

  /**
   * Find a quad that beats the value
   */
  findBeatingQuad(hand, value) {
    const rankGroups = this.groupByRank(hand);
    
    for (const rank in rankGroups) {
      if (rankGroups[rank].length === 4 && rankGroups[rank][0].value > value) {
        return rankGroups[rank];
      }
    }
    
    return null;
  }

  /**
   * Find a straight that beats the current straight
   */
  findBeatingStraight(hand, currentCombo) {
    const currentLength = currentCombo.length;
    const currentValue = currentCombo.value;

    // Try to find same length straight with higher value
    for (let i = 0; i <= hand.length - currentLength; i++) {
      const testCards = hand.slice(i, i + currentLength);
      
      if (Validator.isStraight(testCards) && testCards[testCards.length - 1].value > currentValue) {
        return testCards;
      }
    }

    // Try to find longer straight
    for (let length = currentLength + 1; length <= hand.length; length++) {
      const straight = this.findStraightOfLength(hand, length);
      if (straight) {
        return straight;
      }
    }

    return null;
  }

  /**
   * Find lowest straight in hand
   */
  findLowestStraight(hand) {
    const sorted = [...hand].sort((a, b) => a.value - b.value);
    
    for (let length = 3; length <= sorted.length; length++) {
      for (let i = 0; i <= sorted.length - length; i++) {
        const testCards = sorted.slice(i, i + length);
        if (Validator.isStraight(testCards)) {
          return testCards;
        }
      }
    }
    
    return null;
  }

  /**
   * Find straight of specific length
   */
  findStraightOfLength(hand, length) {
    const sorted = [...hand].sort((a, b) => a.value - b.value);
    
    for (let i = 0; i <= sorted.length - length; i++) {
      const testCards = sorted.slice(i, i + length);
      if (Validator.isStraight(testCards)) {
        return testCards;
      }
    }
    
    return null;
  }

  /**
   * Group cards by rank
   */
  groupByRank(hand) {
    const groups = {};
    
    for (const card of hand) {
      if (!groups[card.rank]) {
        groups[card.rank] = [];
      }
      groups[card.rank].push(card);
    }
    
    return groups;
  }

  /**
   * Decide whether to pass
   */
  shouldPass(hand, currentCombo) {
    if (!currentCombo) return false;
    
    const move = this.tryToBeatCombo(hand, currentCombo);
    
    // If can't beat, must pass
    if (!move) return true;

    // Smart decision: sometimes pass to save good cards
    // Pass if hand is small and move would use high cards
    if (hand.length <= 3) {
      const highCards = move.filter(c => c.value >= 13);
      if (highCards.length > 0) {
        return Math.random() < 0.3; // 30% chance to pass
      }
    }

    return false;
  }
}

module.exports = BotPlayer;
