// Game constants and configurations
module.exports = {
  // Card values (3 is lowest, 2 is highest)
  CARD_VALUES: {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
  },

  // Card suits (not used for comparison in Sam Loc, only for display)
  SUITS: ['hearts', 'diamonds', 'clubs', 'spades'],
  SUIT_SYMBOLS: {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  },

  // Combination types
  COMBO_TYPES: {
    SINGLE: 'single',
    PAIR: 'pair',
    TRIPLE: 'triple',      // Sám
    QUAD: 'quad',          // Tứ quý
    STRAIGHT: 'straight'   // Sảnh
  },

  // Game settings
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 10,
  
  // Special rules
  MIN_STRAIGHT_LENGTH: 3,
  AUTO_WIN_STRAIGHT_LENGTH: 10,  // Sảnh rồng - ăn trắng
  
  // Scoring multipliers
  SCORE_MULTIPLIERS: {
    NORMAL: 1,
    SAM_DECLARED_WIN: 2,      // Báo sâm và thắng
    SAM_DECLARED_LOSE: -2,    // Báo sâm và thua
    CONG: 2,                   // Cóng - chưa đánh lá nào
    THOI_2: 1.5,              // Thối 2 - đánh lá 2 cuối cùng
    AUTO_WIN: 3               // Ăn trắng
  },

  // Turn timeout (ms)
  TURN_TIMEOUT: 30000,  // 30 seconds
  DECLARE_SAM_TIMEOUT: 10000,  // 10 seconds

  // Room settings
  ROOM_TYPES: {
    PUBLIC: 'public',
    PRIVATE: 'private'
  },

  // Game states
  GAME_STATES: {
    WAITING: 'waiting',
    DECLARING_SAM: 'declaring_sam',
    PLAYING: 'playing',
    ENDED: 'ended'
  },

  // Player states
  PLAYER_STATES: {
    WAITING: 'waiting',
    PLAYING: 'playing',
    FINISHED: 'finished',
    DISCONNECTED: 'disconnected'
  },

  // Auto-win conditions
  AUTO_WIN_CONDITIONS: {
    STRAIGHT_10: 'straight_10',      // Sảnh 10 lá
    QUAD_2: 'quad_2',                 // Tứ quý 2
    FIVE_PAIRS: 'five_pairs',         // 5 đôi
    THREE_TRIPLES: 'three_triples'    // 3 sám
  }
};
