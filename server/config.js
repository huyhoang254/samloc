// config.js - Quick configuration for Sâm Lốc game
// Adjust these values to quickly change game settings

module.exports = {
    DEFAULT_PLAYER_COINS: 5000, // Số tiền khởi đầu của mỗi người chơi
    TURN_DURATION: 20,         // Thời gian mỗi lượt (giây)
    MIN_PLAYERS: 2,            // Số người chơi tối thiểu trong phòng
    MAX_PLAYERS: 4,            // Số người chơi tối đa trong phòng
    BOT_ENABLED: true,         // Cho phép thêm bot vào phòng
    ANIMATION_SPEED: 80,       // Tốc độ hiệu ứng chia bài (ms mỗi lá)
    CARD_SIZE: 1.2,            // Tỉ lệ kích thước lá bài (1 = mặc định, 1.2 = tăng 20%)
    MONEY_SYSTEM: {
        ENABLED: true,         // Bật/tắt hệ thống tiền tệ
        MIN_BALANCE: 0,        // Số dư tối thiểu
        ALLOW_NEGATIVE: false  // Có cho phép âm tiền không
    },
    LANGUAGE: 'vi',            // Ngôn ngữ giao diện
    DEBUG_MODE: false          // Bật/tắt chế độ debug
};
