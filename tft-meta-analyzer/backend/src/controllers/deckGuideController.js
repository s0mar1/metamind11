import DeckGuide from '../models/DeckGuide.js';

// @desc    모든 덱 공략 조회
// @route   GET /api/guides
// @access  Public
export const getDeckGuides = async (req, res, next) => {
  try {
    const guides = await DeckGuide.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: guides.length, data: guides });
  } catch (err) {
    next(err);
  }
};

// @desc    특정 덱 공략 조회
// @route   GET /api/guides/:id
// @access  Public
export const getDeckGuide = async (req, res, next) => {
  try {
    const guide = await DeckGuide.findById(req.params.id);
    if (!guide) {
      return res.status(404).json({ success: false, error: '해당 ID의 공략을 찾을 수 없습니다.' });
    }
    res.status(200).json({ success: true, data: guide });
  } catch (err) {
    next(err);
  }
};

// @desc    새 덱 공략 생성
// @route   POST /api/guides
// @access  Private (추후 인증 추가 필요)
export const createDeckGuide = async (req, res, next) => {
  try {
    const guide = await DeckGuide.create(req.body);
    res.status(201).json({ success: true, data: guide });
  } catch (err) {
    next(err);
  }
};