// MoneySystem.js - Hệ thống tiền tệ cho Sâm Lốc
class MoneySystem {
    // Tính phạt cho người thua (còn bài)
    static calculatePenalty(bet, cardsLeft) {
        return bet + cardsLeft;
    }

    // Tính thưởng cho người thắng (về nhất)
    static calculateWinReward(bet, losersCount) {
        return bet * losersCount;
    }

    // Báo Sâm thành công
    static handleSamSuccess(bet, playerCount) {
        return bet * playerCount * 2;
    }

    // Báo Sâm thất bại
    static handleSamFail(bet, playerCount) {
        return bet * playerCount * 2;
    }

    // Ăn trắng
    static handleAutoWin(bet, playerCount) {
        return bet * playerCount;
    }

    // Phạt đặc biệt
    static penaltyThoi2(bet) {
        return bet;
    }
    static penaltyThoiTuQuy(bet) {
        return bet * 2;
    }
    static penaltyCong(bet) {
        return bet * 3;
    }

    // Áp dụng cập nhật số Cá cho tất cả người chơi
    static applyCoinUpdateToAllPlayers(players, coinChanges) {
        return players.map(player => {
            let newBalance = player.coins + (coinChanges[player.id] || 0);
            if (newBalance < 0) newBalance = 0; // Chống âm tiền
            player.coins = newBalance;
            return {
                playerId: player.id,
                coinsChange: coinChanges[player.id] || 0,
                newBalance: newBalance
            };
        });
    }
}

module.exports = MoneySystem;
