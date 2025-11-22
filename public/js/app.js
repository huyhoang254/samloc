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
            showGameToast('Lỗi: ' + data.message, 3500);
            this.hideLoading();
        });

        // Player connected
        socketManager.on('player-connected', (data) => {
              this.player = data.player;
              this.hideLoading();
              socketManager.getRooms(); // lấy danh sách bàn
              // Khi có rooms-list sẽ gọi showLobbyPopup
        });

        // Rooms list
        socketManager.on('rooms-list', (data) => {
            if (this.player) {
                showLobbyPopup(this.player, data.rooms);
            } else {
                this.displayRoomsList(data.rooms);
            }
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
        });

        // Player left room
        socketManager.on('player-left', (data) => {
            this.currentRoom.players = data.players;
            this.currentRoom.host = data.newHost;
            this.updateRoomInfo();
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
            showGameToast('Đang chia bài...', 1000);
            setTimeout(() => {
                gameUI.displayHand(data.hand);
            }, 1000);
        });

        // Sam declared
        socketManager.on('sam-declared', (data) => {
            // Logic handled in gameUI updateGameState
        });

        // Game state update
        socketManager.on('game-state-update', (data) => {
            gameUI.updateGameState(data);
        });

        // Cards played
        socketManager.on('cards-played', (data) => {
            gameUI.displayLastPlayed(data);
            clearInterval(gameUI.turnTimer);
            gameUI.turnTimer = null;
        });

        // Turn passed
        socketManager.on('turn-passed', (data) => {
            // Clear timer when turn passed
            if (gameUI.turnTimer) {
                clearInterval(gameUI.turnTimer);
                gameUI.turnTimer = null;
            }
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
            gameUI.showGameEnd(data);

            // Update player score
            if (this.player && data.scores[this.player.id]) {
                this.player.totalScore = data.scores[this.player.id].totalScore;
                this.updatePlayerInfo();
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

        // Game end modal buttons
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('game-end-modal').classList.remove('active');
            // Gửi yêu cầu bắt đầu ván mới ngay trong phòng
            socketManager.startGame(this.currentRoom.id);
            showGameToast('Đang tạo ván mới...', 2000);
        });

        document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
            document.getElementById('game-end-modal').classList.remove('active');
            socketManager.leaveRoom(this.currentRoom.id);
        });

        // === Popup UI logic ===
        window.addEventListener('DOMContentLoaded', () => {
            document.getElementById('btn-show-create-room').addEventListener('click', showCreateRoomPopup);
            document.getElementById('btn-cancel-create-room').addEventListener('click', hideCreateRoomPopup);
            document.getElementById('btn-popup-create-room').addEventListener('click', () => {
                const roomData = {
                    name: document.getElementById('popup-room-name').value.trim() || undefined,
                    type: document.getElementById('popup-room-type').value,
                    password: document.getElementById('popup-room-password').value || undefined,
                    maxPlayers: parseInt(document.getElementById('popup-max-players').value),
                    betAmount: parseInt(document.getElementById('popup-bet-amount').value)
                };
                hideCreateRoomPopup();
                socketManager.createRoom(roomData);
            });
            document.getElementById('popup-room-type').addEventListener('change', (e) => {
                document.getElementById('popup-password-group').style.display = e.target.value === 'private' ? 'block' : 'none';
            });
        });
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
            let lockIcon = room.hasPassword ? '🔒' : '';
            div.innerHTML = `
                <div class="room-item-info">
                    <h4>${lockIcon} ${room.name}</h4>
                    <p>
                        👥 ${room.players}/${room.maxPlayers} người |
                        ${room.betAmount ? `💰 Cược: ${room.betAmount} |` : ''}
                        ${room.host ? `👑 ${room.host}` : ''}
                    </p>
                </div>
                <button class="btn btn-small btn-primary">Vào</button>
            `;
            div.querySelector('button').addEventListener('click', () => {
                let password = null;
                if (room.hasPassword) {
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
                <span class="player-coins">💰 ${player.coins ?? 0} Cá</span>
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

    // Show screen
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    // Show loading
    showLoading(message = 'Đang tải...') {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.querySelector('p').textContent = message;
            loading.style.display = 'flex';
        }
    }

    // Hide loading
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// === Popup UI logic ===
function showLobbyPopup(player, rooms) {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('lobby-popup').style.display = 'flex';
    document.getElementById('popup-player-name').textContent = player.name;
    document.getElementById('popup-player-score').textContent = `Điểm: ${player.totalScore ?? 0}`;
    renderPopupRoomsList(rooms);
}

function renderPopupRoomsList(rooms) {
    const list = document.getElementById('popup-rooms-list');
    if (!rooms || rooms.length === 0) {
        list.innerHTML = '<p class="text-muted">Không có bàn nào</p>';
        return;
    }
    list.innerHTML = rooms.map(room => `
        <div class="room-item">
            <span><strong>${room.name || 'Bàn #' + room.id}</strong> (${room.players.length}/${room.maxPlayers})</span>
            <button class="btn btn-small" onclick="window.joinRoom('${room.id}')">Vào bàn</button>
        </div>
    `).join('');
}

window.joinRoom = function(roomId) {
    document.getElementById('lobby-popup').style.display = 'none';
    socketManager.joinRoom(roomId);
};

// Show create room popup
function showCreateRoomPopup() {
    document.getElementById('lobby-popup').style.display = 'none';
    document.getElementById('create-room-popup').style.display = 'flex';
}
// Hide create room popup
function hideCreateRoomPopup() {
    document.getElementById('create-room-popup').style.display = 'none';
    document.getElementById('lobby-popup').style.display = 'flex';
}
