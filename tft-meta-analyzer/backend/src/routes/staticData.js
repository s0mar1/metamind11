// backend/src/routes/staticData.js

import express from 'express';
import getTFTData from '../services/tftData.js'; // tftData 서비스 임포트

const router = express.Router();

// 기존의 '/' 라우트 (tftData.items.forEach 에러 해결 로직 포함)
router.get('/', async (req, res, next) => {
  try {
    const tft = await getTFTData();

    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.krNameMap) {
      console.error('TFT static 데이터 로드 실패 또는 불완전 (staticData.js - /):', tft);
      return res.status(503).json({ error: 'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }

    // 💡 수정 지점: tftData.items.forEach가 사용되던 부분의 해결책
    // 모든 아이템 카테고리를 순회하여 하나의 배열로 합치는 로직
    let allItemsFlattened = [];
    for (const categoryName in tft.items) {
      if (Array.isArray(tft.items[categoryName])) {
        allItemsFlattened = allItemsFlattened.concat(tft.items[categoryName]);
      }
    }

    // 이 라우터가 무엇을 반환해야 하는지에 따라 응답을 구성합니다.
    // 기존 로직과 동일하게, 로드된 모든 아이템의 개수를 반환한다고 가정합니다.
    res.json({
      status: 'success',
      message: 'TFT static data loaded and processed successfully for / route.',
      totalItems: allItemsFlattened.length,
      // 필요한 다른 데이터 반환
    });

  } catch (err) {
    console.error('--- [staticData.js / 에러 핸들러] ---');
    next(err);
  }
});

// 💡 추가: 새로운 /tft-meta 엔드포인트 구현 (체크리스트 #2)
router.get('/tft-meta', async (req, res, next) => {
  try {
    const tft = await getTFTData();

    // tftData가 제대로 로드되었는지 확인하는 로직 (Match.js, Summoner.js와 유사)
    // tft.items는 이제 객체이므로, 최소한 completed 아이템이 있는지 등으로 확인
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.krNameMap) {
      console.error('TFT static 데이터 로드 실패 또는 불완전 (routes/staticData.js - /tft-meta):', tft);
      // tftData가 null이거나 불완전하면 503 Service Unavailable 반환
      return res.status(503).json({ error: 'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }

    // getTFTData()에서 반환된 전체 tftData 객체를 JSON으로 전달
    res.json(tft);

  } catch (err) {
    console.error('--- [routes/staticData.js /tft-meta 에러 핸들러] ---');
    next(err); // 에러를 Express 에러 핸들링 미들웨어로 전달
  }
});

// 이 라우터를 다른 파일에서 사용할 수 있도록 export
export default router;