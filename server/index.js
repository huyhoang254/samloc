const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const RoomManager = require('./managers/RoomManager');
const PlayerManager = require('./managers/PlayerManager');
const Card = require('./game/Card');
const BotPlayer = require('./game/BotPlayer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Managers
const roomManager = new RoomManager();
const playerManager = new PlayerManager();

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: roomManager.getRoomCount(),
    players: playerManager.getPlayerCount()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  /**
   * Player connects and provides their info
   */
  socket.on('player-connect', (data) => {
    try {
      const player = playerManager.addPlayer(socket.id, data);

      socket.emit('player-connected', {
        success: true,
        player: playerManager.getPlayerInfo(player.id)
      });

      // Gửi danh sách tất cả phòng (cả công khai và riêng tư)
      socket.emit('rooms-list', {
        rooms: roomManager.getAllRooms()
      });

      console.log(`Player connected: ${player.name} (${player.id})`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Create a new room
   */
  socket.on('create-room', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);

      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const room = roomManager.createRoom(player, data);

      socket.join(room.id);

      socket.emit('room-created', {
        success: true,
        room: {
          id: room.id,
          name: room.name,
          type: room.type,
          players: room.players,
          maxPlayers: room.maxPlayers,
          betAmount: room.betAmount,
          host: room.host
        }
      });

      // Broadcast to all that a new room is available
      if (room.type === 'public') {
        io.emit('rooms-list', {
          rooms: roomManager.getAllRooms()
        });
      }

      console.log(`Room created: ${room.id} by ${player.name}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Join a room
   */
  socket.on('join-room', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);

      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const result = roomManager.joinRoom(data.roomId, player, data.password);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(data.roomId);

      socket.emit('room-joined', {
        success: true,
        room: {
          id: result.room.id,
          name: result.room.name,
          type: result.room.type,
          players: result.room.players,
          maxPlayers: result.room.maxPlayers,
          betAmount: result.room.betAmount,
          host: result.room.host
        }
      });

      // Notify others in room
      socket.to(data.roomId).emit('player-joined', {
        player: playerManager.getPlayerInfo(player.id),
        players: result.room.players
      });

      // Update rooms list
      io.emit('rooms-list', {
        rooms: roomManager.getAllRooms()
      });

      console.log(`${player.name} joined room ${data.roomId}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Add bot to room
   */
  socket.on('add-bot', (data) => {
    try {
      const room = roomManager.getRoom(data.roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Create bot player
      const botId = `bot-${Date.now()}`;
      const botNames = ['Bot Cao Thủ', 'Bot Siêu Việt', 'Bot Phàm Nhân', 'Bot Thiên Tài'];
      const botName = botNames[room.players.length % botNames.length];

      const botPlayer = {
        id: botId,
        socketId: null,
        name: botName,
        isBot: true,
        coins: 5000
      };

      room.players.push(botPlayer);

      // Notify all players
      io.to(data.roomId).emit('player-joined', {
        player: {
          id: botId,
          name: botName,
          isBot: true
        },
        players: room.players
      });

      console.log(`Bot ${botName} added to room ${data.roomId}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Leave a room
   */
  socket.on('leave-room', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);

      if (!player) return;

      const result = roomManager.leaveRoom(data.roomId, player.id);

      if (result.success) {
        socket.leave(data.roomId);

        socket.emit('room-left', { success: true });

        if (!result.roomDeleted) {
          // Notify others
          socket.to(data.roomId).emit('player-left', {
            playerId: player.id,
            playerName: player.name,
            players: result.room.players,
            newHost: result.room.host
          });
        }

        // Update rooms list
        io.emit('rooms-list', {
          rooms: roomManager.getAllRooms()
        });

        console.log(`${player.name} left room ${data.roomId}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Start game
   */
  socket.on('start-game', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);
      const result = roomManager.startGame(data.roomId, player.id);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const room = result.room;
      const gameResult = result.gameResult;

      // Send game started to all players in room
      io.to(data.roomId).emit('game-started', {
        success: true,
        state: gameResult.state,
        firstPlayer: gameResult.firstPlayer
      });

      // Send each player their hand privately
      room.players.forEach(p => {
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.emit('cards-dealt', {
            hand: gameResult.hands[p.id],
            firstPlayer: gameResult.firstPlayer
          });
        }
      });

      // Check for auto-win
      if (gameResult.autoWin) {
        io.to(data.roomId).emit('game-ended', {
          autoWin: true,
          winner: gameResult.winner,
          condition: gameResult.condition,
          hands: gameResult.hands
        });
      } else {
        // Start bot AI loop
        setTimeout(() => {
          processBotTurn(data.roomId);
        }, 1000);
      }

      console.log(`Game started in room ${data.roomId}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Declare Sam
   */
  socket.on('declare-sam', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);
      const room = roomManager.getRoom(data.roomId);

      if (!room || !room.game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const result = room.game.declareSam(player.id);

      if (result.success) {
        io.to(data.roomId).emit('sam-declared', {
          declarer: result.declarer,
          declarerName: result.declarerName
        });

        // Send current game state
        io.to(data.roomId).emit('game-state-update',
          room.game.getPublicState()
        );
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Skip Sam declaration
   */
  socket.on('skip-sam', (data) => {
    try {
      const room = roomManager.getRoom(data.roomId);

      if (!room || !room.game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      room.game.skipSamDeclaration();

      io.to(data.roomId).emit('game-state-update',
        room.game.getPublicState()
      );
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Play cards
   */
  socket.on('play-cards', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);
      const room = roomManager.getRoom(data.roomId);

      if (!room || !room.game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Convert card data to Card objects
      const cards = data.cards.map(c => new Card(c.rank, c.suit));

      const result = room.game.playCards(player.id, cards);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      // Broadcast the play to all players
      io.to(data.roomId).emit('cards-played', {
        playerId: player.id,
        playerName: player.name,
        cards: data.cards,
        combo: result.combo,
        cardsLeft: result.cardsLeft,
        nextPlayer: result.nextPlayer
      });

      // Send updated hand to player
      socket.emit('hand-update', {
        hand: room.game.players[player.id].hand
      });

      // Check if need to declare one
      if (result.needDeclareOne) {
        socket.emit('need-declare-one');
      }

      // Check if game ended
      if (result.gameEnded) {
        // Update player stats
        for (const playerId in result.scores) {
          playerManager.updatePlayerStats(playerId, result);
        }

        io.to(data.roomId).emit('game-ended', {
          winner: result.winner,
          winnerName: result.winnerName,
          scores: result.scores,
          coins: require('./game/ScoreCalculator').calculateEndGameCoins(room.game.players, result.winner, room.game.options.betAmount),
          samDeclarer: result.samDeclarer,
          finalHands: result.finalHands
        });

        // Reset room state
        room.state = 'waiting';
        room.game = null;
      } else {
        // Send updated game state
        io.to(data.roomId).emit('game-state-update',
          room.game.getPublicState()
        );

        // Process bot turn after delay
        setTimeout(() => {
          processBotTurn(data.roomId);
        }, 1500);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Pass turn
   */
  socket.on('pass-turn', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);
      const room = roomManager.getRoom(data.roomId);

      if (!room || !room.game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const result = room.game.passTurn(player.id);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      io.to(data.roomId).emit('turn-passed', {
        playerId: player.id,
        playerName: player.name,
        nextPlayer: result.nextPlayer,
        roundWinner: result.roundWinner,
        roundWinnerName: result.roundWinnerName
      });

      io.to(data.roomId).emit('game-state-update',
        room.game.getPublicState()
      );

      // Process bot turn after delay
      setTimeout(() => {
        processBotTurn(data.roomId);
      }, 1500);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Declare one
   */
  socket.on('declare-one', (data) => {
    try {
      const player = playerManager.getPlayer(socket.id);
      const room = roomManager.getRoom(data.roomId);

      if (!room || !room.game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const result = room.game.declareOne(player.id);

      if (result.success) {
        io.to(data.roomId).emit('one-declared', {
          playerId: result.playerId,
          playerName: result.playerName
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });



  /**
   * Get rooms list
   */
  socket.on('get-rooms', () => {
    socket.emit('rooms-list', {
      rooms: roomManager.getAllRooms()
    });
  });

  /**
   * Disconnect
   */
  socket.on('disconnect', () => {
    const player = playerManager.getPlayer(socket.id);

    if (player) {
      console.log(`Player disconnected: ${player.name}`);

      // Remove from all rooms
      roomManager.removePlayerFromAllRooms(player.id);

      // Remove player
      playerManager.removePlayer(socket.id);

      // Update rooms list
      io.emit('rooms-list', {
        rooms: roomManager.getAllRooms()
      });
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎮 Sâm Lốc server running on http://localhost:${PORT}`);
  console.log(`📊 WebSocket server ready`);
});

// Bot AI processing function
function processBotTurn(roomId) {
  try {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.game || room.game.state === 'ended') return;

    const currentPlayer = room.game.players[room.game.getCurrentPlayer()];
    if (!currentPlayer) return;

    // Find the actual player object to check if it's a bot
    const playerInRoom = room.players.find(p => p.id === currentPlayer.id);
    if (!playerInRoom || !playerInRoom.isBot) return;

    // Create bot instance
    const bot = new BotPlayer(currentPlayer.id, currentPlayer.name);

    // Handle Sam declaration phase
    if (room.game.state === 'declaring_sam') {
      const shouldDeclare = bot.shouldDeclareSam(currentPlayer.hand);

      if (shouldDeclare) {
        const result = room.game.declareSam(currentPlayer.id);
        if (result.success) {
          io.to(roomId).emit('sam-declared', {
            declarer: result.declarer,
            declarerName: result.declarerName
          });
        }
      }

      // Skip sam after delay
      setTimeout(() => {
        if (room.game && room.game.state === 'declaring_sam') {
          room.game.skipSamDeclaration();
          io.to(roomId).emit('game-state-update', room.game.getPublicState());

          // Continue with first turn
          setTimeout(() => processBotTurn(roomId), 1000);
        }
      }, 2000);

      return;
    }

    // Decide move
    const isFirstMove = !room.game.currentCombo;
    const shouldPass = bot.shouldPass(currentPlayer.hand, room.game.currentCombo);

    if (shouldPass && !isFirstMove) {
      // Pass turn
      const result = room.game.passTurn(currentPlayer.id);

      if (result.success) {
        io.to(roomId).emit('turn-passed', {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          nextPlayer: result.nextPlayer,
          roundWinner: result.roundWinner,
          roundWinnerName: result.roundWinnerName
        });

        io.to(roomId).emit('game-state-update', room.game.getPublicState());

        // Next turn
        setTimeout(() => processBotTurn(roomId), 1500);
      }
    } else {
      // Play cards
      const cardsToPlay = bot.decideMove(
        currentPlayer.hand,
        room.game.currentCombo,
        isFirstMove
      );

      if (cardsToPlay) {
        const result = room.game.playCards(currentPlayer.id, cardsToPlay);

        if (result.success) {
          // Broadcast the play
          io.to(roomId).emit('cards-played', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            cards: cardsToPlay,
            combo: result.combo,
            cardsLeft: result.cardsLeft,
            nextPlayer: result.nextPlayer
          });

          // Auto declare one if needed
          if (result.cardsLeft === 1) {
            room.game.declareOne(currentPlayer.id);
            io.to(roomId).emit('one-declared', {
              playerId: currentPlayer.id,
              playerName: currentPlayer.name
            });
          }

          // Check if game ended
          if (result.gameEnded) {
            io.to(roomId).emit('game-ended', {
              winner: result.winner,
              winnerName: result.winnerName,
              scores: result.scores,
              samDeclarer: result.samDeclarer,
              finalHands: result.finalHands
            });

            room.state = 'waiting';
            room.game = null;
          } else {
            io.to(roomId).emit('game-state-update', room.game.getPublicState());

            // Next turn
            setTimeout(() => processBotTurn(roomId), 1500);
          }
        }
      } else if (!isFirstMove) {
        // Can't play, must pass
        const result = room.game.passTurn(currentPlayer.id);

        if (result.success) {
          io.to(roomId).emit('turn-passed', {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            nextPlayer: result.nextPlayer,
            roundWinner: result.roundWinner,
            roundWinnerName: result.roundWinnerName
          });

          io.to(roomId).emit('game-state-update', room.game.getPublicState());
          setTimeout(() => processBotTurn(roomId), 1500);
        }
      }
    }
  } catch (error) {
    console.error('Bot turn error:', error);
  }
}

// Cleanup interval (every 5 minutes)
setInterval(() => {
  roomManager.cleanupEmptyRooms();
  console.log(`🧹 Cleanup: ${roomManager.getRoomCount()} rooms, ${playerManager.getPlayerCount()} players`);
}, 300000);
