/**
 * PlayerManager - Manages connected players
 */
class PlayerManager {
  constructor() {
    this.players = new Map(); // socketId -> player object
    this.playersByUserId = new Map(); // userId -> player object
  }

  /**
   * Add a new player
   */
  addPlayer(socketId, playerData) {
    const player = {
      id: playerData.userId || socketId,
      socketId: socketId,
      name: playerData.name,
      totalScore: 0,
      coins: 5000,
      gamesPlayed: 0,
      gamesWon: 0,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };

    this.players.set(socketId, player);
    this.playersByUserId.set(player.id, player);

    return player;
  }

  /**
   * Remove a player
   */
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    
    if (player) {
      this.playersByUserId.delete(player.id);
      this.players.delete(socketId);
    }

    return player;
  }

  /**
   * Get player by socket ID
   */
  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  /**
   * Get player by user ID
   */
  getPlayerByUserId(userId) {
    return this.playersByUserId.get(userId);
  }

  /**
   * Update player activity
   */
  updateActivity(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.lastActivity = Date.now();
    }
  }

  /**
   * Update player stats after game
   */
  updatePlayerStats(playerId, gameResult) {
    const player = this.playersByUserId.get(playerId);
    
    if (player) {
      player.gamesPlayed++;
      
      if (gameResult.winner === playerId) {
        player.gamesWon++;
      }
      
      if (gameResult.scores && gameResult.scores[playerId]) {
        player.totalScore = gameResult.scores[playerId].totalScore;
      }
    }
  }

  /**
   * Get player count
   */
  getPlayerCount() {
    return this.players.size;
  }

  /**
   * Get all players
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Get player info (public)
   */
  getPlayerInfo(playerId) {
    const player = this.playersByUserId.get(playerId);
    
    if (!player) return null;

    return {
      id: player.id,
      name: player.name,
      totalScore: player.totalScore,
      gamesPlayed: player.gamesPlayed,
      gamesWon: player.gamesWon,
      winRate: player.gamesPlayed > 0 
        ? ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1) 
        : 0
    };
  }

  /**
   * Clean up inactive players (optional)
   */
  cleanupInactivePlayers(timeoutMs = 3600000) { // 1 hour default
    const now = Date.now();
    const toRemove = [];

    for (const [socketId, player] of this.players.entries()) {
      if (now - player.lastActivity > timeoutMs) {
        toRemove.push(socketId);
      }
    }

    toRemove.forEach(socketId => this.removePlayer(socketId));

    return toRemove.length;
  }
}

module.exports = PlayerManager;
