import express from 'express';
import DeckTier from '../models/DeckTier.js';

const router = express.Router();

// GET /api/tierlist
router.get('/', async (req, res, next) => {
  try {
    // 가장 많이 사용되었고(totalGames), 평균 등수가 좋은 덱 순서로 정렬합니다.
    const tiers = await DeckTier.find({ totalGames: { $gte: 5 } }) // 최소 5판 이상 플레이된 덱만
      .sort({ top4Count: -1, averagePlacement: 1 }) // 4등 안에 든 횟수(내림차순), 평균등수(오름차순)
      .limit(20); // 상위 20개 덱만 보여주기

    res.json(tiers);
  } catch (error) {
    console.error('티어리스트 조회 중 에러 발생:', error.message);
    next(error);
  }
});

export default router;