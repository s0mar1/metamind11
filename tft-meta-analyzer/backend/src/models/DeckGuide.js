import mongoose from 'mongoose';

const LevelBoardSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  board: {
    type: String, // 예: 챔피언 배치 정보를 담은 JSON 문자열 또는 커스텀 코드
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
});

const DeckGuideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '공략 제목을 입력해주세요.'],
    trim: true,
    maxlength: [100, '제목은 100자를 초과할 수 없습니다.']
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  level_boards: [LevelBoardSchema],
  play_tips: {
    type: [String],
    default: []
  },
  recommended_items: {
    type: [String], // 아이템 API 이름 목록
    default: []
  },
  recommended_augments: {
    type: [String], // 증강체 API 이름 목록
    default: []
  }
}, { timestamps: true });

export default mongoose.model('DeckGuide', DeckGuideSchema);