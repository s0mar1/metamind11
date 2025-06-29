import express from 'express';
const router = express.Router();
import {
  getDeckGuides,
  getDeckGuide,
  createDeckGuide
} from '../controllers/deckGuideController.js';

// 전체 공략 조회 및 새 공략 생성 라우트
router.route('/')
  .get(getDeckGuides)
  .post(createDeckGuide);

// 특정 공략 조회 라우트
router.route('/:id')
  .get(getDeckGuide);

export default router;