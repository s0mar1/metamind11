// backend/src/routes/staticData.js

import express from 'express';
import getTFTData from '../services/tftData.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsDataPath = path.join(__dirname, '..', 'data', 'tft14_items_index.json');


router.get('/items-by-category', async (req, res, next) => {
  try {
    // 1. tftData.js로부터 최신 "마스터 데이터베이스"를 가져옵니다.
    const tft = await getTFTData();
    if (!tft || !tft.items) {
      throw new Error('TFT 아이템 데이터를 서비스에서 가져올 수 없습니다.');
    }
    const allItemsFromService = Object.values(tft.items).flat();

    // 2. 이름의 미세한 차이를 극복하기 위한 정규화 함수를 정의합니다.
    const normalizeName = (name) => {
      // 소문자로 바꾸고, 모든 공백, 점(.), 따옴표(')를 제거합니다.
      return (name || '').toLowerCase().replace(/[\s.'']/g, '');
    };

    // 3. "정규화된 한국어 이름"을 Key로 사용하는 마스터 Map을 생성합니다.
    const masterItemMap = new Map();
    for (const item of allItemsFromService) {
      const normalizedKey = normalizeName(item.name);
      if (normalizedKey && !masterItemMap.has(normalizedKey)) {
        masterItemMap.set(normalizedKey, item);
      }
    }
    
    // 4. 우리가 직접 관리하는 JSON 파일(분류 기준)을 읽어옵니다.
    const itemsData = JSON.parse(fs.readFileSync(itemsDataPath, 'utf8'));
    const categorizedItems = {};
    
    // 5. JSON 파일의 카테고리("일반 아이템", "상징 아이템" 등)를 순회합니다.
    for (const category in itemsData) {
      if (Object.hasOwnProperty.call(itemsData, category)) {
        categorizedItems[category] = [];
        
        // 6. 각 카테고리에 속한 아이템 목록을 순회합니다.
        for (const itemFromJson of itemsData[category]) {
          // 7. JSON 파일의 한국어 이름도 동일하게 정규화하여 Key로 사용합니다.
          const normalizedKeyFromJson = normalizeName(itemFromJson.korean_name);
          
          // 8. 정규화된 Key로 마스터 Map에서 최신 아이템 정보를 찾습니다.
          const liveItemData = masterItemMap.get(normalizedKeyFromJson);
          
          if (liveItemData) {
            // 매칭에 성공하면 최종 목록에 추가합니다.
            categorizedItems[category].push(liveItemData);
          } else {
            console.warn(`[매칭 실패] JSON 아이템 '${itemFromJson.korean_name}'을(를) 마스터 데이터베이스에서 찾을 수 없습니다.`);
          }
        }
      }
    }
    
    res.json(categorizedItems);

  } catch (error) {
    console.error("[items-by-category] 에러 발생:", error);
    next(error);
  }
});


// --- 다른 페이지에서 사용하는 API (변경 없음) ---
router.get('/tft-meta', async (req, res, next) => {
  try {
    const tft = await getTFTData();
    console.log('[staticData.js] Checking tft data before 503 check:');
    console.log('  tft.traitMap?.size:', tft.traitMap?.size);
    console.log('  tft.champions?.length:', tft.champions?.length);
    console.log('  tft.items?.completed?.length:', tft.items?.completed?.length);
    console.log('  tft.krNameMap:', !!tft.krNameMap);
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.krNameMap) {
      return res.status(503).json({ error: 'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }
    // 💡 핵심 수정: traitMap을 [key, value] 배열로 변환하여 전송
    const responseTft = {
      ...tft,
      traitMap: Array.from(tft.traitMap.entries()),
      krNameMap: Array.from(tft.krNameMap.entries()), // krNameMap도 Map이므로 함께 변환
    };
    res.json(responseTft);
  } catch (err) {
    next(err);
  }
});

export default router;