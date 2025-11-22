const { v4: uuidv4 } = require('uuid');
const GameEngine = require('../game/GameEngine');
const { ROOM_TYPES, MIN_PLAYERS, MAX_PLAYERS } = require('../utils/constants');

/**
 * RoomManager - Manages game rooms
 */
class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> room object
  }

  /**
   * Create a new room
   */
  createRoom(hostPlayer, options = {}) {
    const roomId = this.generateRoomId();
    
    const room = {
      id: roomId,
      name: options.name || `Room ${roomId.slice(0, 6)}`,
      type: options.type || ROOM_TYPES.PUBLIC,
      password: options.password || null,
      host: hostPlayer.id,
      players: [hostPlayer],
      maxPlayers: options.maxPlayers || MAX_PLAYERS,
      betAmount: options.betAmount || 0,
      state: 'waiting', // waiting, playing
      game: null,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Join a room
   */
  joinRoom(roomId, player, password = null) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.state === 'playing') {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.type === ROOM_TYPES.PRIVATE && room.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    // Check if player already in room
    if (room.players.find(p => p.id === player.id)) {
      return { success: false, error: 'Already in room' };
    }

    room.players.push(player);

    return { success: true, room };
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.players = room.players.filter(p => p.id !== playerId);

    // If host leaves, assign new host or delete room
    if (room.host === playerId) {
      if (room.players.length > 0) {
        room.host = room.players[0].id;
      } else {
        this.rooms.delete(roomId);
        return { success: true, roomDeleted: true };
      }
    }

    return { success: true, room };
  }

  /**
   * Start game in a room
   */
  startGame(roomId, hostId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.host !== hostId) {
      return { success: false, error: 'Only host can start game' };
    }

    if (room.players.length < MIN_PLAYERS) {
      return { success: false, error: `Need at least ${MIN_PLAYERS} players` };
    }

    if (room.state === 'playing') {
      return { success: false, error: 'Game already in progress' };
    }

    // Create game engine
    room.game = new GameEngine(roomId, room.players, {
      betAmount: room.betAmount
    });

    room.state = 'playing';

    // Start the game
    const gameResult = room.game.startGame();

    return {
      success: true,
      room,
      gameResult
    };
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get all public rooms
   */
  getPublicRooms() {
    const publicRooms = [];
    
    for (const room of this.rooms.values()) {
      if (room.type === ROOM_TYPES.PUBLIC && room.state === 'waiting') {
        publicRooms.push({
          id: room.id,
          name: room.name,
          players: room.players.length,
          maxPlayers: room.maxPlayers,
          betAmount: room.betAmount,
          host: room.players.find(p => p.id === room.host)?.name
        });
      }
    }

    return publicRooms;
  }

  /**
   * Get player's current room
   */
  getPlayerRoom(playerId) {
    for (const room of this.rooms.values()) {
      if (room.players.find(p => p.id === playerId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Remove player from all rooms
   */
  removePlayerFromAllRooms(playerId) {
    for (const room of this.rooms.values()) {
      if (room.players.find(p => p.id === playerId)) {
        this.leaveRoom(room.id, playerId);
      }
    }
  }

  /**
   * Generate unique room ID
   */
  generateRoomId() {
    return uuidv4().split('-')[0].toUpperCase();
  }

  /**
   * Clean up empty rooms
   */
  cleanupEmptyRooms() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Get room count
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Get total player count
   */
  getTotalPlayerCount() {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.players.length;
    }
    return count;
  }
}

module.exports = RoomManager;
