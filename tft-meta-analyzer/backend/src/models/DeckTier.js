// backend/src/models/DeckTier.js
import mongoose from 'mongoose';

const DeckTierSchema = new mongoose.Schema({
  deckKey: {
    type: String,
    required: true,
    unique: true,
  },
  carryChampionName: { type: String, required: true },
  traits: [{
    name: String,
    tier_current: Number,
    image_url: String, // 이미지 URL 필드
  }],
  top4Count: {
    type: Number,
    default: 0,
  },
  totalGames: {
    type: Number,
    default: 0,
  },
  averagePlacement: {
    type: Number,
    default: 0,
  },
  winCount: {
    type: Number,
    default: 0,
  },
  tierRank: { 
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

const DeckTier = mongoose.model('DeckTier', DeckTierSchema);

export default DeckTier;