# Sâm Lốc - Multiplayer Card Game

Một website chơi bài Sâm Lốc online với hỗ trợ multiplayer real-time sử dụng WebSocket.

## Tính năng chính

- ✅ Tạo phòng công khai hoặc riêng tư (có mật khẩu)
- ✅ Hỗ trợ 2-4 người chơi
- ✅ Chia bài ngẫu nhiên (mỗi người 10 lá)
- ✅ Quản lý lượt đánh real-time
- ✅ Hỗ trợ các combo: lẻ, đôi, sám, tứ quý, sảnh
- ✅ Báo Sâm (xin làng)
- ✅ Báo 1 khi còn 1 lá
- ✅ Xử lý thối 2, cóng, ăn trắng
- ✅ Tính điểm/cược tự động
- ✅ Chat trong phòng
- ✅ Giao diện real-time với Socket.io

## Luật chơi Sâm Lốc

### Cấu trúc bài
- Sử dụng bộ bài Tây 52 lá (không phân biệt chất)
- Giá trị: 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2
- Mỗi người 10 lá bài
- 2-4 người chơi

### Các loại tổ hợp
1. **Bài lẻ**: 1 lá bài
2. **Đôi**: 2 lá cùng giá trị
3. **Sám**: 3 lá cùng giá trị
4. **Tứ quý**: 4 lá cùng giá trị
5. **Sảnh**: Ít nhất 3 lá liên tiếp (VD: 3-4-5, 10-J-Q-K-A)

### Quy tắc đánh
- Người có bài nhỏ nhất đánh trước (ván đầu)
- Người thắng ván trước đánh đầu (các ván sau)
- Người tiếp theo phải chặn bằng tổ hợp cao hơn hoặc bỏ
- Khi không ai chặn được, người đánh trước tiếp tục đánh vòng mới

### Báo Sâm
- Sau khi chia bài, người chơi có thể báo Sâm nếu tin bài mình mạnh
- Nếu thắng: được thưởng x2 điểm
- Nếu thua: bị phạt x2 điểm

### Trường hợp đặc biệt
- **Thối 2**: Đánh lá 2 cuối cùng → phạt x1.5
- **Cóng**: Chưa đánh lá nào mà người khác hết bài → phạt x2
- **Ăn trắng**: Có sảnh 10 lá, tứ quý 2, 5 đôi, hoặc 3 sám → thắng ngay
- **Báo 1**: Phải báo khi còn 1 lá, không báo → phạt

## Cài đặt

### Yêu cầu
- Node.js >= 16.x
- npm hoặc yarn

### Cài đặt dependencies

```bash
npm install
```

### Chạy server

```bash
# Development mode với nodemon
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## Cấu trúc dự án

```
samloc/
├── server/
│   ├── index.js              # Entry point server
│   ├── game/
│   │   ├── GameEngine.js     # Core game logic
│   │   ├── Card.js           # Card model
│   │   ├── Deck.js           # Deck shuffling
│   │   ├── Validator.js      # Validate card combinations
│   │   └── ScoreCalculator.js # Calculate scores/bets
│   ├── managers/
│   │   ├── RoomManager.js    # Room management
│   │   └── PlayerManager.js  # Player management
│   └── utils/
│       └── constants.js      # Game constants
├── public/
│   ├── index.html            # Main page
│   ├── css/
│   │   └── style.css         # Styles
│   ├── js/
│   │   ├── app.js            # Main client app
│   │   ├── game.js           # Game UI logic
│   │   └── socket.js         # Socket.io client
│   └── assets/
│       └── cards/            # Card images
├── package.json
└── README.md
```

## Sử dụng

1. Mở trình duyệt và truy cập `http://localhost:3000`
2. Nhập tên người chơi
3. Chọn "Tạo phòng" hoặc "Vào phòng"
4. Đợi đủ người chơi (2-4 người)
5. Bắt đầu chơi!

## WebSocket Events

### Client → Server
- `create-room`: Tạo phòng mới
- `join-room`: Vào phòng
- `start-game`: Bắt đầu ván
- `declare-sam`: Báo Sâm
- `play-cards`: Đánh bài
- `pass-turn`: Bỏ lượt
- `declare-one`: Báo 1
- `chat-message`: Gửi tin nhắn

### Server → Client
- `room-created`: Phòng đã tạo
- `player-joined`: Người chơi vào phòng
- `game-started`: Ván bắt đầu
- `cards-dealt`: Chia bài
- `turn-changed`: Đổi lượt
- `cards-played`: Bài được đánh
- `game-ended`: Ván kết thúc
- `score-updated`: Cập nhật điểm

## Tùy chỉnh

Bạn có thể tùy chỉnh các luật chơi trong file `server/utils/constants.js`:
- Số người chơi tối thiểu/tối đa
- Điểm thưởng/phạt
- Thời gian chờ mỗi lượt
- Quy tắc ăn trắng

## License

MIT
