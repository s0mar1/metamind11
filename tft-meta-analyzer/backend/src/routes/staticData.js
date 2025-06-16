// backend/src/routes/staticData.js

import express from 'express';
import getTFTData from '../services/tftData.js';

const router = express.Router();
// Community Dragon의 CDN 기본 주소
const CDN_URL_PREFIX = 'https://raw.communitydragon.org/latest/game/';
// 경로를 완전한 URL로 변환하는 헬퍼 함수
const toPNG = (path) => (path ? `${CDN_URL_PREFIX}${path.toLowerCase().replace(/\.(tex|dds)$/, '.png')}` : null);

router.get('/', async (req, res, next) => {
    try {
        const tftData = await getTFTData();
        if (!tftData) {
            return res.status(503).json({ error: 'TFT 데이터를 불러오는 데 실패했습니다.' });
        }

        // 챔피언 데이터의 'tileIcon'을 완전한 URL로 변환
        const processedChampions = tftData.champions.map(champ => ({
            ...champ,
            tileIcon: toPNG(champ.tileIcon)
        }));

        // 아이템과 증강체를 분류하고, 각각의 'icon'을 완전한 URL로 변환
        const items = [];
        const augments = [];
        if (tftData.items) {
            tftData.items.forEach(item => {
                const processedItem = { ...item, icon: toPNG(item.icon) };
                if (item.icon && item.icon.includes('Augments')) {
                    augments.push(processedItem);
                } else if (item.icon && !item.isElusive) {
                    items.push(processedItem);
                }
            });
        }
        
        // 특성 데이터의 'icon'을 완전한 URL로 변환
        const processedTraits = Array.from(tftData.traitMap.values()).map(trait => ({...trait, icon: toPNG(trait.icon)}));

        // 최종적으로 가공된 데이터를 프론트엔드에 전달
        res.json({
            champions: processedChampions,
            items,
            augments,
            traits: processedTraits,
        });
    } catch (error) {
        next(error);
    }
});

export default router;