// Socket.io connection manager
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.eventHandlers = {};
    }

    connect() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.emit('connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.emit('disconnected');
        });

        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
            this.emit('error', data);
        });

        // Player events
        this.socket.on('player-connected', (data) => {
            this.emit('player-connected', data);
        });

        // Room events
        this.socket.on('rooms-list', (data) => {
            this.emit('rooms-list', data);
        });

        this.socket.on('room-created', (data) => {
            this.emit('room-created', data);
        });

        this.socket.on('room-joined', (data) => {
            this.emit('room-joined', data);
        });

        this.socket.on('room-left', (data) => {
            this.emit('room-left', data);
        });

        this.socket.on('player-joined', (data) => {
            this.emit('player-joined', data);
        });

        this.socket.on('player-left', (data) => {
            this.emit('player-left', data);
        });

        // Game events
        this.socket.on('game-started', (data) => {
            this.emit('game-started', data);
        });

        this.socket.on('cards-dealt', (data) => {
            this.emit('cards-dealt', data);
        });

        this.socket.on('sam-declared', (data) => {
            this.emit('sam-declared', data);
        });

        this.socket.on('game-state-update', (data) => {
            this.emit('game-state-update', data);
        });

        this.socket.on('cards-played', (data) => {
            this.emit('cards-played', data);
        });

        this.socket.on('turn-passed', (data) => {
            this.emit('turn-passed', data);
        });

        this.socket.on('one-declared', (data) => {
            this.emit('one-declared', data);
        });

        this.socket.on('hand-update', (data) => {
            this.emit('hand-update', data);
        });

        this.socket.on('need-declare-one', () => {
            this.emit('need-declare-one');
        });

        this.socket.on('game-ended', (data) => {
            this.emit('game-ended', data);
        });


    }

    // Event emitter pattern
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }

    // Send events to server
    send(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        } else {
            console.error('Not connected to server');
        }
    }

    // Specific methods
    playerConnect(name) {
        this.send('player-connect', { name });
    }

    createRoom(roomData) {
        this.send('create-room', roomData);
    }

    joinRoom(roomId, password) {
        this.send('join-room', { roomId, password });
    }

    leaveRoom(roomId) {
        this.send('leave-room', { roomId });
    }

    addBot(roomId) {
        this.send('add-bot', { roomId });
    }

    startGame(roomId) {
        this.send('start-game', { roomId });
    }

    declareSam(roomId) {
        this.send('declare-sam', { roomId });
    }

    skipSam(roomId) {
        this.send('skip-sam', { roomId });
    }

    playCards(roomId, cards) {
        this.send('play-cards', { roomId, cards });
    }

    passTurn(roomId) {
        this.send('pass-turn', { roomId });
    }

    declareOne(roomId) {
        this.send('declare-one', { roomId });
    }



    getRooms() {
        this.send('get-rooms');
    }
}

// Create global instance
const socketManager = new SocketManager();
