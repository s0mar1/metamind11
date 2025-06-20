// backend/src/routes/staticData.js (수정)

import express from 'express';
import getTFTData from '../services/tftData.js';

const router = express.Router();
const CDN_URL_PREFIX = 'https://raw.communitydragon.org/latest/game/';

// toPNG 함수를 tftData.js의 '권장 수정' 버전과 동일하게 복사하여 붙여넣습니다.
const toPNG = (path) => {
  if (!path) return null;
  let lowerPath = path.toLowerCase();

  if (/\.(png|jpg|jpeg|gif)$/.test(lowerPath)) {
    return `${CDN_URL_PREFIX}${lowerPath}`;
  }
  if (lowerPath.endsWith('.tex') || lowerPath.endsWith('.dds')) {
    return `${CDN_URL_PREFIX}${lowerPath.replace(/\.(tex|dds)$/, '.png')}`;
  }
  const lastDotIndex = lowerPath.lastIndexOf('.');
  if (lastDotIndex > lowerPath.lastIndexOf('/') && lowerPath.substring(lastDotIndex).length <= 5) {
      return `${CDN_URL_PREFIX}${lowerPath.substring(0, lastDotIndex)}.png`;
  }
  return `${CDN_URL_PREFIX}${lowerPath}.png`;
};

router.get('/', async (req, res, next) => {
    try {
        const tftData = await getTFTData();
        if (!tftData) {
            return res.status(503).json({ error: 'TFT 데이터를 불러오는 데 실패했습니다.' });
        }

        const items = [];
        const augments = [];
        if (tftData.items) {
            tftData.items.forEach(item => {
                // item.icon은 이미 tftData.js에서 toPNG가 적용된 URL입니다.
                if (item.icon && item.icon.includes('Augments')) {
                    augments.push(item);
                } else if (item.icon && !item.isElusive) {
                    items.push(item);
                }
            });
        }
        
        res.json({
            champions: tftData.champions,
            items,
            augments,
            traits: Array.from(tftData.traitMap.values()),
        });
    } catch (error) {
        next(error);
    }
});

export default router;