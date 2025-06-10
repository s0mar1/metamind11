const mongoose = require('./db');

const MatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  participants: { type: Array, default: [] },
  gameDuration: Number,
  metadata: Object
}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);
