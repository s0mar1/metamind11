import mongoose from 'mongoose';

const DeckTierSchema = new mongoose.Schema({
  deckKey: { type: String, required: true, unique: true },
  tierRank: { type: String },
  tierOrder: { type: Number }, // S=1, A=2... 정렬을 위한 필드
  carryChampionName: { type: String, required: true },
  mainTraitName: { type: String },
  
  // ⬇️⬇️⬇️ UI에 필요한 모든 정보를 담을 필드들 ⬇️⬇️⬇️
  coreUnits: [{
    name: String,
    apiName: String,
    image_url: String,
    cost: Number,
    // 각 유닛별 추천 아이템 3개
    recommendedItems: [{
        name: String,
        image_url: String,
    }]
  }],
  
  totalGames: { type: Number, default: 0 },
  top4Count: { type: Number, default: 0 },
  winCount: { type: Number, default: 0 },
  averagePlacement: { type: Number, default: 0 },
}, { timestamps: true });

// 티어 순서, 평균 등수 순으로 인덱스를 만들어 조회 속도를 향상시킵니다.
DeckTierSchema.index({ tierOrder: 1, averagePlacement: 1 });

const DeckTier = mongoose.model('DeckTier', DeckTierSchema);

export default DeckTier;