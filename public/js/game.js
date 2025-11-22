// Game UI Manager
class GameUI {
    constructor() {
        this.currentRoom = null;
        this.myHand = [];
        this.selectedCards = [];
        this.gameState = null;
        this.myPlayerId = null;
        this.turnTimer = null;
        this.turnTimeLeft = 0;
        this.turnDuration = 30; // 30 seconds
    }

    // Initialize game screen
    init(roomId, playerId) {
        this.currentRoom = roomId;
        this.myPlayerId = playerId;
        this.selectedCards = [];
        
        document.getElementById('game-room-id').textContent = roomId;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Play cards button
        document.getElementById('btn-play-cards').addEventListener('click', () => {
            if (this.selectedCards.length > 0) {
                this.playSelectedCards();
            }
        });

        // Pass button
        document.getElementById('btn-pass').addEventListener('click', () => {
            socketManager.passTurn(this.currentRoom);
        });

        // Declare Sam button
        document.getElementById('btn-declare-sam').addEventListener('click', () => {
            socketManager.declareSam(this.currentRoom);
            document.getElementById('btn-declare-sam').style.display = 'none';
        });

        // Declare One button
        document.getElementById('btn-declare-one').addEventListener('click', () => {
            socketManager.declareOne(this.currentRoom);
            document.getElementById('btn-declare-one').style.display = 'none';
        });

        // Game chat
        document.getElementById('btn-game-send-chat').addEventListener('click', () => {
            this.sendGameChat();
        });

        document.getElementById('game-chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendGameChat();
            }
        });
    }

    // Display player's hand
    displayHand(hand) {
        this.myHand = hand;
        this.selectedCards = [];
        
        const container = document.getElementById('player-cards');
        container.innerHTML = '';

        hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            container.appendChild(cardElement);
        });

        document.getElementById('hand-count').textContent = hand.length;

        // Check if should show declare one button
        if (hand.length === 1) {
            document.getElementById('btn-declare-one').style.display = 'inline-block';
        }
    }

    // Create card element
    createCardElement(card, index) {
        const div = document.createElement('div');
        div.className = 'card-item';
        
        // Add color class
        if (card.suit === 'hearts' || card.suit === 'diamonds') {
            div.classList.add('red');
        } else {
            div.classList.add('black');
        }

        // Suit symbol
        const suitSymbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };

        div.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${suitSymbols[card.suit]}</div>
            <div class="card-rank-bottom">${card.rank}</div>
        `;

        // Click handler only if not in display
        if (index >= 0) {
            div.addEventListener('click', () => {
                this.toggleCardSelection(index, div);
            });
            div.dataset.index = index;
        }

        return div;
    }

    // Toggle card selection
    toggleCardSelection(index, element) {
        const cardIndex = this.selectedCards.indexOf(index);
        
        if (cardIndex > -1) {
            // Deselect
            this.selectedCards.splice(cardIndex, 1);
            element.classList.remove('selected');
        } else {
            // Select
            this.selectedCards.push(index);
            element.classList.add('selected');
        }

        // Update play button
        const playBtn = document.getElementById('btn-play-cards');
        playBtn.disabled = this.selectedCards.length === 0;
    }

    // Play selected cards
    playSelectedCards() {
        const cards = this.selectedCards.map(index => this.myHand[index]);
        socketManager.playCards(this.currentRoom, cards);
    }

    // Update game state
    updateGameState(state) {
        this.gameState = state;

        // Update current turn info
        const currentPlayer = state.players[state.currentPlayer];
        const isMyTurn = state.currentPlayer === this.myPlayerId;
        
        document.getElementById('current-turn-info').textContent = 
            isMyTurn ? '🎯 Lượt của bạn!' : `Lượt: ${currentPlayer.name}`;

        // Update Sam declarer info
        if (state.samDeclarer) {
            const declarer = state.players[state.samDeclarer];
            document.getElementById('sam-declarer-info').textContent = 
                `⭐ ${declarer.name} đã báo Sâm`;
        }

        // Update other players
        this.updateOtherPlayers(state);

        // Update buttons
        this.updateButtons(isMyTurn, state);

        // Update history
        this.updateHistory(state.turnHistory);

        // Start turn timer
        this.startTurnTimer(state.currentPlayer, isMyTurn);
    }

    // Update other players display
    updateOtherPlayers(state) {
        const otherPlayers = state.playerOrder.filter(id => id !== this.myPlayerId);
        
        otherPlayers.forEach((playerId, index) => {
            const player = state.players[playerId];
            const slot = document.getElementById(`player-slot-${index + 1}`);
            
            if (slot) {
                const initials = player.name.substring(0, 2).toUpperCase();
                const isCurrentTurn = playerId === state.currentPlayer;
                
                slot.innerHTML = `
                    <div class="player-avatar" data-player-id="${playerId}">
                        ${initials}
                        ${isCurrentTurn ? '<div class="timer-circle" id="timer-circle-' + (index + 1) + '"></div>' : ''}
                    </div>
                    <div class="player-info-box">
                        <div class="player-slot-name">${player.name}</div>
                        <div class="player-slot-cards">🎴 ${player.cardCount} lá</div>
                        ${player.declaredOne ? '<div style="color: #ff6b6b; font-size: 12px;">⚠️ Báo 1!</div>' : ''}
                    </div>
                `;

                // Highlight current turn
                if (isCurrentTurn) {
                    slot.classList.add('current-turn');
                } else {
                    slot.classList.remove('current-turn');
                }
            }
        });
    }

    // Update buttons
    updateButtons(isMyTurn, state) {
        const playBtn = document.getElementById('btn-play-cards');
        const passBtn = document.getElementById('btn-pass');
        const playerHand = document.querySelector('.player-hand');

        if (isMyTurn) {
            playBtn.disabled = this.selectedCards.length === 0;
            
            // Can only pass if there's a combo on table
            passBtn.disabled = !state.currentCombo;
            
            // Highlight player's hand when it's their turn
            if (playerHand) {
                playerHand.classList.add('my-turn');
            }
        } else {
            playBtn.disabled = true;
            passBtn.disabled = true;
            
            // Remove highlight
            if (playerHand) {
                playerHand.classList.remove('my-turn');
            }
        }
    }

    // Display last played cards
    displayLastPlayed(data) {
        const container = document.getElementById('last-played-cards');
        container.innerHTML = '';

        if (data.cards && data.cards.length > 0) {
            data.cards.forEach(card => {
                const cardElement = this.createCardElement(card, -1);
                cardElement.style.cursor = 'default';
                container.appendChild(cardElement);
            });

            document.getElementById('last-played-info').textContent = 
                `${data.playerName} đánh ${this.getComboName(data.combo)}`;
        } else {
            container.innerHTML = '<p class="text-muted">Chưa có bài nào</p>';
        }
    }

    // Get combo name in Vietnamese
    getComboName(combo) {
        if (!combo) return '';

        const typeNames = {
            'single': 'Lẻ',
            'pair': 'Đôi',
            'triple': 'Sám',
            'quad': 'Tứ quý',
            'straight': 'Sảnh'
        };

        return typeNames[combo.type] || combo.type;
    }

    // Update history
    updateHistory(history) {
        if (!history) return;

        const container = document.getElementById('history-list');
        container.innerHTML = '';

        // Show last 5 moves
        const recentHistory = history.slice(-5).reverse();
        
        recentHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            if (item.action === 'pass') {
                div.textContent = `${item.playerName} bỏ lượt`;
            } else if (item.combo) {
                div.textContent = `${item.playerName} đánh ${this.getComboName(item.combo)}`;
            }
            
            container.appendChild(div);
        });
    }

    // Show game end modal
    showGameEnd(result) {
        const modal = document.getElementById('game-end-modal');
        const title = document.getElementById('game-end-title');
        const info = document.getElementById('game-end-info');
        const scoresTable = document.getElementById('scores-table');

        // Set title
        if (result.winner === this.myPlayerId) {
            title.textContent = '🎉 Bạn thắng!';
            title.style.color = '#28a745';
        } else {
            title.textContent = '😔 Bạn thua';
            title.style.color = '#dc3545';
        }

        // Show winner info
        info.innerHTML = `<h3>Người thắng: ${result.winnerName}</h3>`;

        if (result.samDeclarer) {
            const declarer = result.scores[result.samDeclarer];
            info.innerHTML += `<p>⭐ Báo Sâm: ${result.winnerName}</p>`;
        }

        // Show scores
        scoresTable.innerHTML = '';
        
        for (const playerId in result.scores) {
            const playerScore = result.scores[playerId];
            const isWinner = playerId === result.winner;
            
            const row = document.createElement('div');
            row.className = `score-row ${isWinner ? 'winner' : 'loser'}`;
            
            row.innerHTML = `
                <div class="score-info">
                    <strong>${this.gameState.players[playerId].name}</strong>
                    <div>Số lá còn: ${playerScore.cardsLeft}</div>
                    ${playerScore.penalties.length > 0 ? 
                        `<div class="text-muted">${playerScore.penalties.map(p => p.description).join(', ')}</div>` 
                        : ''}
                </div>
                <div class="score-value ${playerScore.score >= 0 ? 'positive' : 'negative'}">
                    ${playerScore.score >= 0 ? '+' : ''}${playerScore.score}
                </div>
            `;
            
            scoresTable.appendChild(row);
        }

        modal.classList.add('active');
    }

    // Add chat message to game chat
    addGameChatMessage(data) {
        const container = document.getElementById('game-chat-messages');
        
        const div = document.createElement('div');
        div.className = 'chat-message';
        
        div.innerHTML = `
            <div class="chat-message-header">${data.playerName}</div>
            <div class="chat-message-text">${this.escapeHtml(data.message)}</div>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // Send game chat
    sendGameChat() {
        const input = document.getElementById('game-chat-input');
        const message = input.value.trim();
        
        if (message) {
            socketManager.sendChatMessage(this.currentRoom, message);
            input.value = '';
        }
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Start turn timer
    startTurnTimer(currentPlayerId, isMyTurn) {
        // Clear existing timer
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }

        // Reset timer
        this.turnTimeLeft = this.turnDuration;

        // Find which slot has the current player
        let timerCircleId = null;
        
        if (!isMyTurn) {
            const otherPlayers = this.gameState.playerOrder.filter(id => id !== this.myPlayerId);
            const currentIndex = otherPlayers.indexOf(currentPlayerId);
            if (currentIndex >= 0) {
                timerCircleId = `timer-circle-${currentIndex + 1}`;
            }
        }

        // Start countdown
        this.turnTimer = setInterval(() => {
            this.turnTimeLeft--;

            // Update timer display
            this.updateTimerDisplay(timerCircleId, isMyTurn);

            // Auto pass when time runs out
            if (this.turnTimeLeft <= 0) {
                clearInterval(this.turnTimer);
                this.turnTimer = null;

                if (isMyTurn) {
                    // Auto pass for current player
                    this.autoPass();
                }
            }
        }, 1000);

        // Initial display
        this.updateTimerDisplay(timerCircleId, isMyTurn);
    }

    // Update timer display
    updateTimerDisplay(timerCircleId, isMyTurn) {
        const percentage = (this.turnTimeLeft / this.turnDuration) * 100;
        const circumference = 2 * Math.PI * 55; // radius = 55
        const offset = circumference - (percentage / 100) * circumference;

        // Determine color state
        let colorClass = '';
        if (this.turnTimeLeft <= 5) {
            colorClass = 'danger';
        } else if (this.turnTimeLeft <= 10) {
            colorClass = 'warning';
        }

        // Update other player's timer
        if (timerCircleId) {
            const timerElement = document.getElementById(timerCircleId);
            if (timerElement) {
                timerElement.className = `timer-circle ${colorClass}`;
                timerElement.innerHTML = `
                    <svg>
                        <circle cx="58" cy="58" r="55" 
                            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};">
                        </circle>
                    </svg>
                    <div class="timer-text">${this.turnTimeLeft}s</div>
                `;
            }
        }

        // Update current player's info
        if (isMyTurn) {
            const turnInfo = document.getElementById('current-turn-info');
            if (this.turnTimeLeft <= 5) {
                turnInfo.textContent = `🎯 Lượt của bạn! (${this.turnTimeLeft}s) ⚠️`;
                turnInfo.style.color = '#ef4444';
            } else {
                turnInfo.textContent = `🎯 Lượt của bạn! (${this.turnTimeLeft}s)`;
                turnInfo.style.color = 'white';
            }
        }
    }

    // Auto pass when time runs out
    autoPass() {
        if (this.gameState && this.gameState.currentCombo) {
            console.log('Auto passing due to timeout');
            socketManager.passTurn(this.currentRoom);
        }
    }

    // Reset game UI
    reset() {
        this.currentRoom = null;
        this.myHand = [];
        this.selectedCards = [];
        this.gameState = null;
        
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        
        document.getElementById('player-cards').innerHTML = '';
        document.getElementById('last-played-cards').innerHTML = '';
        document.getElementById('history-list').innerHTML = '';
        document.getElementById('game-chat-messages').innerHTML = '';
    }
}

// Create global instance
const gameUI = new GameUI();
