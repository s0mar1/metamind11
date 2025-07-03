import express from 'express';
const router = express.Router();
import {
  getDeckGuides,
  getDeckGuide,
  createDeckGuide
} from '../controllers/deckGuideController.js';

// Guide 모델 임포트 (필요하다면 경로 수정)
import DeckGuide from '../models/DeckGuide.js'; 

// 임시 관리자 권한 미들웨어 (실제 구현 시에는 사용자 인증 시스템과 연동)
const isAdmin = (req, res, next) => {
  // TODO: 실제 관리자 권한 확인 로직 구현
  // 현재는 임시로 true를 반환하여 관리자 권한이 있다고 가정합니다.
  // 실제 환경에서는 JWT 토큰 검증, 세션 확인, DB에서 사용자 역할 조회 등을 통해
  // 사용자가 관리자인지 확인해야 합니다.
  const userIsAdmin = true; // 임시: 항상 관리자로 간주

  if (userIsAdmin) {
    next(); // 관리자라면 다음 미들웨어 또는 라우트 핸들러로 진행
  } else {
    res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
};

// 전체 공략 조회 및 새 공략 생성 라우트
router.route('/')
  .get(getDeckGuides)
  .post(createDeckGuide);

// 특정 공략 조회 라우트
router.route('/:id')
  .get(getDeckGuide)
  .delete(isAdmin, async (req, res) => { // DELETE 엔드포인트 추가
    try {
      const { id } = req.params;
      const deletedGuide = await DeckGuide.findByIdAndDelete(id);

      if (!deletedGuide) {
        return res.status(404).json({ message: '공략을 찾을 수 없습니다.' });
      }
      res.status(200).json({ message: '공략이 성공적으로 삭제되었습니다.' });
    } catch (error) {
      console.error('공략 삭제 중 오류 발생:', error);
      res.status(500).json({ message: '서버 오류로 공략 삭제에 실패했습니다.' });
    }
  });

export default router;