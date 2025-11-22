const { SCORE_MULTIPLIERS } = require('../utils/constants');

/**
 * ScoreCalculator for calculating scores and penalties
 */
class ScoreCalculator {
    // TÍCH HỢP HỆ THỐNG TIỀN TỆ
    static calculateEndGameCoins(players, winnerId, bet) {
      const MoneySystem = require('./MoneySystem');
      const coinChanges = {};
      const losers = Object.values(players).filter(p => p.id !== winnerId);
      coinChanges[winnerId] = MoneySystem.calculateWinReward(bet, losers.length);
      losers.forEach(loser => {
        coinChanges[loser.id] = -MoneySystem.calculatePenalty(bet, loser.hand.length);
      });
      return MoneySystem.applyCoinUpdateToAllPlayers(Object.values(players), coinChanges);
    }

    static handleSamSuccessCoins(players, samId, bet) {
      const MoneySystem = require('./MoneySystem');
      const coinChanges = {};
      Object.values(players).forEach(p => {
        if (p.id === samId) {
          coinChanges[p.id] = MoneySystem.handleSamSuccess(bet, Object.keys(players).length);
        } else {
          coinChanges[p.id] = -MoneySystem.handleSamSuccess(bet, Object.keys(players).length) / (Object.keys(players).length - 1);
        }
      });
      return MoneySystem.applyCoinUpdateToAllPlayers(Object.values(players), coinChanges);
    }

    static handleSamFailCoins(players, samId, bet) {
      const MoneySystem = require('./MoneySystem');
      const coinChanges = {};
      Object.values(players).forEach(p => {
        if (p.id === samId) {
          coinChanges[p.id] = -MoneySystem.handleSamFail(bet, Object.keys(players).length);
        } else {
          coinChanges[p.id] = MoneySystem.handleSamFail(bet, Object.keys(players).length) / (Object.keys(players).length - 1);
        }
      });
      return MoneySystem.applyCoinUpdateToAllPlayers(Object.values(players), coinChanges);
    }

    static handleAutoWinCoins(players, winnerId, bet) {
      const MoneySystem = require('./MoneySystem');
      const coinChanges = {};
      Object.values(players).forEach(p => {
        if (p.id === winnerId) {
          coinChanges[p.id] = MoneySystem.handleAutoWin(bet, Object.keys(players).length - 1);
        } else {
          coinChanges[p.id] = -bet;
        }
      });
      return MoneySystem.applyCoinUpdateToAllPlayers(Object.values(players), coinChanges);
    }

    static penaltyThoi2Coins(player, bet) {
      const MoneySystem = require('./MoneySystem');
      return -MoneySystem.penaltyThoi2(bet);
    }
    static penaltyThoiTuQuyCoins(player, bet) {
      const MoneySystem = require('./MoneySystem');
      return -MoneySystem.penaltyThoiTuQuy(bet);
    }
    static penaltyCongCoins(player, bet) {
      const MoneySystem = require('./MoneySystem');
      return -MoneySystem.penaltyCong(bet);
    }
  /**
   * Calculate end-game scores for all players
   * @param {Object} gameState - Current game state
   * @returns {Object} Score results for each player
   */
  static calculateScores(gameState) {
    const { players, winner, samDeclarer } = gameState;
    const scores = {};

    for (const playerId in players) {
      const player = players[playerId];
      let score = 0;
      let penalties = [];
      let bonuses = [];

      // Winner gets positive score
      if (playerId === winner) {
        score = this.calculateWinnerScore(player, players, samDeclarer);
        
        if (playerId === samDeclarer) {
          bonuses.push({
            type: 'sam_declared',
            multiplier: SCORE_MULTIPLIERS.SAM_DECLARED_WIN,
            description: 'Báo Sâm và thắng'
          });
        }
      } else {
        // Losers get negative score based on remaining cards
        const baseScore = player.hand.length;
        
        // Check for penalties
        const penaltyInfo = this.calculatePenalties(player, gameState);
        score = -baseScore * penaltyInfo.multiplier;
        penalties = penaltyInfo.penalties;
      }

      scores[playerId] = {
        score,
        cardsLeft: player.hand.length,
        penalties,
        bonuses,
        totalScore: player.totalScore + score
      };
    }

    return scores;
  }

  /**
   * Calculate winner's score
   */
  static calculateWinnerScore(winner, allPlayers, samDeclarer) {
    let totalScore = 0;

    // Sum up all losers' cards
    for (const playerId in allPlayers) {
      if (playerId !== winner.id) {
        totalScore += allPlayers[playerId].hand.length;
      }
    }

    // Apply sam multiplier if applicable
    if (winner.id === samDeclarer) {
      totalScore *= SCORE_MULTIPLIERS.SAM_DECLARED_WIN;
    }

    return totalScore;
  }

  /**
   * Calculate penalties for a player
   */
  static calculatePenalties(player, gameState) {
    let multiplier = SCORE_MULTIPLIERS.NORMAL;
    const penalties = [];

    // Cóng penalty - never played any card
    if (player.cardsPlayed === 0) {
      multiplier *= SCORE_MULTIPLIERS.CONG;
      penalties.push({
        type: 'cong',
        multiplier: SCORE_MULTIPLIERS.CONG,
        description: 'Cóng - chưa đánh lá nào'
      });
    }

    // Thối 2 penalty - last card played was a 2
    if (this.hasThoi2(player)) {
      multiplier *= SCORE_MULTIPLIERS.THOI_2;
      penalties.push({
        type: 'thoi_2',
        multiplier: SCORE_MULTIPLIERS.THOI_2,
        description: 'Thối 2 - đánh lá 2 cuối cùng'
      });
    }

    // Sam declared but lost
    if (player.id === gameState.samDeclarer) {
      multiplier *= Math.abs(SCORE_MULTIPLIERS.SAM_DECLARED_LOSE);
      penalties.push({
        type: 'sam_failed',
        multiplier: Math.abs(SCORE_MULTIPLIERS.SAM_DECLARED_LOSE),
        description: 'Báo Sâm nhưng không thắng'
      });
    }

    return { multiplier, penalties };
  }

  /**
   * Check if player has thối 2 (last move was a single 2)
   */
  static hasThoi2(player) {
    if (!player.lastMove || !player.hand.length > 0) return false;
    
    // Check if hand contains only a single 2
    if (player.hand.length === 1 && player.hand[0].rank === '2') {
      return true;
    }

    // Check if last move was a 2 and still has cards
    if (player.lastMove.cards && 
        player.lastMove.cards.length === 1 && 
        player.lastMove.cards[0].rank === '2' &&
        player.hand.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Calculate auto-win score
   */
  static calculateAutoWinScore(winner, allPlayers) {
    let totalScore = 0;

    for (const playerId in allPlayers) {
      if (playerId !== winner.id) {
        totalScore += 10; // All players have 10 cards at start
      }
    }

    return totalScore * SCORE_MULTIPLIERS.AUTO_WIN;
  }

  /**
   * Calculate score for a specific bet amount
   */
  static calculateBetScores(gameState, betAmount) {
    const baseScores = this.calculateScores(gameState);
    const betScores = {};

    for (const playerId in baseScores) {
      betScores[playerId] = {
        ...baseScores[playerId],
        betAmount: baseScores[playerId].score * betAmount,
        totalMoney: (baseScores[playerId].score * betAmount)
      };
    }

    return betScores;
  }
}

module.exports = ScoreCalculator;
