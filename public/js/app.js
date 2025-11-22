// Main Application
class App {
    constructor() {
        this.currentScreen = 'login';
        this.player = null;
        this.currentRoom = null;
    }

    init() {
        // Connect socket manager
        socketManager.connect();
        
        // Setup socket event handlers
        this.setupSocketHandlers();
        
        // Setup UI event handlers
        this.setupUIHandlers();

        // Show login screen
        this.showScreen('login');
    }

    setupSocketHandlers() {
        // Connection
        socketManager.on('connected', () => {
            console.log('Connected!');
            this.hideLoading();
        });

        socketManager.on('disconnected', () => {
            console.log('Disconnected!');
            this.showLoading('Mất kết nối...');
        });

        socketManager.on('error', (data) => {
            alert('Lỗi: ' + data.message);
            this.hideLoading();
        });

        // Player connected
        socketManager.on('player-connected', (data) => {
            this.player = data.player;
            this.showScreen('lobby');
            this.updatePlayerInfo();
            this.hideLoading();
        });

        // Rooms list
        socketManager.on('rooms-list', (data) => {
            this.displayRoomsList(data.rooms);
        });

        // Room created
        socketManager.on('room-created', (data) => {
            this.currentRoom = data.room;
            this.showScreen('room');
            this.updateRoomInfo();
            this.hideLoading();
        });

        // Room joined
        socketManager.on('room-joined', (data) => {
            this.currentRoom = data.room;
            this.showScreen('room');
            this.updateRoomInfo();
            this.hideLoading();
        });

        // Player joined room
        socketManager.on('player-joined', (data) => {
            this.currentRoom.players = data.players;
            this.updateRoomInfo();
            this.addChatMessage(`${data.player.name} đã vào phòng`, 'system');
        });

        // Player left room
        socketManager.on('player-left', (data) => {
            this.currentRoom.players = data.players;
            this.currentRoom.host = data.newHost;
            this.updateRoomInfo();
            this.addChatMessage(`${data.playerName} đã rời phòng`, 'system');
        });

        // Room left
        socketManager.on('room-left', () => {
            this.currentRoom = null;
            this.showScreen('lobby');
            socketManager.getRooms();
        });

        // Game started
        socketManager.on('game-started', (data) => {
            this.showScreen('game');
            gameUI.init(this.currentRoom.id, this.player.id);
            
            // Show declare sam button if in declaring phase
            if (data.state === 'declaring_sam') {
                document.getElementById('btn-declare-sam').style.display = 'inline-block';
                
                // Auto skip after timeout
                setTimeout(() => {
                    if (document.getElementById('btn-declare-sam').style.display !== 'none') {
                        socketManager.skipSam(this.currentRoom.id);
                    }
                }, 10000);
            }
        });

        // Cards dealt
        socketManager.on('cards-dealt', (data) => {
            gameUI.displayHand(data.hand);
        });

        // Sam declared
        socketManager.on('sam-declared', (data) => {
            gameUI.addGameChatMessage({
                playerName: 'Hệ thống',
                message: `⭐ ${data.declarerName} đã báo Sâm!`
            });
        });

        // Game state update
        socketManager.on('game-state-update', (data) => {
            gameUI.updateGameState(data);
        });

        // Cards played
        socketManager.on('cards-played', (data) => {
            gameUI.displayLastPlayed(data);
            gameUI.addGameChatMessage({
                playerName: 'Hệ thống',
                message: `${data.playerName} đánh ${gameUI.getComboName(data.combo)}`
            });
            
            // Clear timer when cards played
            if (gameUI.turnTimer) {
                clearInterval(gameUI.turnTimer);
                gameUI.turnTimer = null;
            }
        });

        // Turn passed
        socketManager.on('turn-passed', (data) => {
            if (data.roundWinner) {
                gameUI.addGameChatMessage({
                    playerName: 'Hệ thống',
                    message: `${data.roundWinnerName} thắng vòng, được đánh tiếp`
                });
            } else {
                gameUI.addGameChatMessage({
                    playerName: 'Hệ thống',
                    message: `${data.playerName} bỏ lượt`
                });
            }
            
            // Clear timer when turn passed
            if (gameUI.turnTimer) {
                clearInterval(gameUI.turnTimer);
                gameUI.turnTimer = null;
            }
        });

        // One declared
        socketManager.on('one-declared', (data) => {
            gameUI.addGameChatMessage({
                playerName: 'Hệ thống',
                message: `⚠️ ${data.playerName} báo 1!`
            });
        });

        // Hand update
        socketManager.on('hand-update', (data) => {
            gameUI.displayHand(data.hand);
        });

        // Need declare one
        socketManager.on('need-declare-one', () => {
            document.getElementById('btn-declare-one').style.display = 'inline-block';
        });

        // Game ended
        socketManager.on('game-ended', (data) => {
            if (data.autoWin) {
                alert(`Ăn trắng! ${data.condition.description}`);
            }
            
            gameUI.showGameEnd(data);
            
            // Update player score
            if (this.player && data.scores[this.player.id]) {
                this.player.totalScore = data.scores[this.player.id].totalScore;
                this.updatePlayerInfo();
            }
        });

        // Chat message
        socketManager.on('chat-message', (data) => {
            if (this.currentScreen === 'room') {
                this.addChatMessage(data.message, data.playerName);
            } else if (this.currentScreen === 'game') {
                gameUI.addGameChatMessage(data);
            }
        });
    }

    setupUIHandlers() {
        // Login
        document.getElementById('btn-connect').addEventListener('click', () => {
            const name = document.getElementById('player-name').value.trim();
            if (name) {
                this.showLoading('Đang kết nối...');
                socketManager.playerConnect(name);
            } else {
                alert('Vui lòng nhập tên!');
            }
        });

        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-connect').click();
            }
        });

        // Room type change
        document.getElementById('room-type').addEventListener('change', (e) => {
            const passwordGroup = document.getElementById('password-group');
            passwordGroup.style.display = e.target.value === 'private' ? 'block' : 'none';
        });

        // Create room
        document.getElementById('btn-create-room').addEventListener('click', () => {
            const roomData = {
                name: document.getElementById('room-name').value.trim() || undefined,
                type: document.getElementById('room-type').value,
                password: document.getElementById('room-password').value || undefined,
                maxPlayers: parseInt(document.getElementById('max-players').value),
                betAmount: parseInt(document.getElementById('bet-amount').value)
            };

            this.showLoading('Đang tạo phòng...');
            socketManager.createRoom(roomData);
        });

        // Refresh rooms
        document.getElementById('btn-refresh-rooms').addEventListener('click', () => {
            socketManager.getRooms();
        });

        // Leave room
        document.getElementById('btn-leave-room').addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn rời phòng?')) {
                socketManager.leaveRoom(this.currentRoom.id);
            }
        });

        // Add bot
        document.getElementById('btn-add-bot').addEventListener('click', () => {
            socketManager.addBot(this.currentRoom.id);
        });

        // Start game
        document.getElementById('btn-start-game').addEventListener('click', () => {
            socketManager.startGame(this.currentRoom.id);
        });

        // Chat in room
        document.getElementById('btn-send-chat').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Game end modal buttons
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('game-end-modal').classList.remove('active');
            this.showScreen('room');
            this.updateRoomInfo();
        });

        document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
            document.getElementById('game-end-modal').classList.remove('active');
            socketManager.leaveRoom(this.currentRoom.id);
        });
    }

    // Show screen
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    // Update player info
    updatePlayerInfo() {
        if (this.player) {
            document.getElementById('player-info-name').textContent = this.player.name;
            document.getElementById('player-info-score').textContent = 
                `Điểm: ${this.player.totalScore}`;
        }
    }

    // Display rooms list
    displayRoomsList(rooms) {
        const container = document.getElementById('rooms-list');
        
        if (rooms.length === 0) {
            container.innerHTML = '<p class="text-muted">Không có phòng nào</p>';
            return;
        }

        container.innerHTML = '';

        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'room-item';
            
            div.innerHTML = `
                <div class="room-item-info">
                    <h4>${room.name}</h4>
                    <p>
                        👥 ${room.players}/${room.maxPlayers} người | 
                        💰 Cược: ${room.betAmount} | 
                        👑 ${room.host}
                    </p>
                </div>
                <button class="btn btn-small btn-primary">Vào</button>
            `;

            div.querySelector('button').addEventListener('click', () => {
                let password = null;
                if (room.type === 'private') {
                    password = prompt('Nhập mật khẩu phòng:');
                    if (password === null) return;
                }
                
                this.showLoading('Đang vào phòng...');
                socketManager.joinRoom(room.id, password);
            });

            container.appendChild(div);
        });
    }

    // Update room info
    updateRoomInfo() {
        if (!this.currentRoom) return;

        document.getElementById('room-title').textContent = this.currentRoom.name;
        document.getElementById('room-id').textContent = `ID: ${this.currentRoom.id}`;
        document.getElementById('player-count').textContent = this.currentRoom.players.length;
        document.getElementById('max-player-count').textContent = this.currentRoom.maxPlayers;

        // Update players list
        const container = document.getElementById('room-players-list');
        container.innerHTML = '';

        this.currentRoom.players.forEach(player => {
            const div = document.createElement('div');
            div.className = 'player-item';
            
            if (player.id === this.currentRoom.host) {
                div.classList.add('host');
            }

            div.innerHTML = `
                <span>${player.name} ${player.isBot ? '🤖' : ''}</span>
                ${player.id === this.currentRoom.host ? 
                    '<span class="player-badge badge-host">Chủ phòng</span>' : ''}
            `;

            container.appendChild(div);
        });

        // Show buttons if host
        const isHost = this.player.id === this.currentRoom.host;
        const enoughPlayers = this.currentRoom.players.length >= 2;
        const roomNotFull = this.currentRoom.players.length < this.currentRoom.maxPlayers;
        
        const addBotBtn = document.getElementById('btn-add-bot');
        const startBtn = document.getElementById('btn-start-game');
        
        addBotBtn.style.display = (isHost && roomNotFull) ? 'inline-block' : 'none';
        startBtn.style.display = (isHost && enoughPlayers) ? 'inline-block' : 'none';
    }

    // Add chat message
    addChatMessage(message, sender) {
        const container = document.getElementById('chat-messages');
        
        const div = document.createElement('div');
        div.className = 'chat-message';
        
        if (sender === 'system') {
            div.innerHTML = `<div class="chat-message-text text-muted">${message}</div>`;
        } else {
            div.innerHTML = `
                <div class="chat-message-header">${sender}</div>
                <div class="chat-message-text">${this.escapeHtml(message)}</div>
            `;
        }
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // Send chat message
    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message && this.currentRoom) {
            socketManager.sendChatMessage(this.currentRoom.id, message);
            input.value = '';
        }
    }

    // Show/hide loading
    showLoading(message = 'Đang tải...') {
        const loading = document.getElementById('loading');
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
