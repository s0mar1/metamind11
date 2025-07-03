// routes/match.js

import express from 'express';
import { getMatchDetail } from '../services/riotApi.js';
import getTFTData, { getTraitStyleInfo } from '../services/tftData.js';
import { getAccountsByPuuids } from '../services/riotAccountApi.js';

const router = express.Router();

router.get('/:matchId', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID가 필요합니다.' });
    }

    const tft = await getTFTData();
    const matchDetail = await getMatchDetail(matchId);

    // 💡 수정: tft.items?.completed?.length (예시)로 데이터를 검사
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.krNameMap) { // completed 아이템이 존재함을 확인
      console.error('TFT static 데이터 로드 실패 또는 불완전 (match.js):', tft);
      return res.status(503).json({ error:'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }
    if (!matchDetail) {
        return res.status(404).json({ error: '매치 상세 정보를 찾을 수 없습니다.' });
    }

    const puuids = matchDetail.info.participants.map(p => p.puuid);
    const accounts = await getAccountsByPuuids(puuids);

    const processedParticipants = matchDetail.info.participants.map(p => {
      const units = p.units.map(u => {
        const ch = tft.champions.find(c => c.apiName?.toLowerCase() === u.character_id?.toLowerCase());
        if (!ch) {
          console.warn(`WARN (match.js): 챔피언 ${u.character_id} (매치 ${matchDetail.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음.`);
        }
        
        const processedItems = (u.itemNames || []).map(n => {
          // 💡 수정: tft.items가 객체이므로, 모든 아이템 카테고리 배열을 순회하여 아이템을 찾도록 변경
          let foundItem = null;
          // 모든 아이템 카테고리를 순회하며 아이템을 찾습니다.
          for (const category in tft.items) {
              // tft.items[category]가 배열이고, 그 안에 아이템이 있다면
              if (Array.isArray(tft.items[category])) {
                  foundItem = tft.items[category].find(i => i.apiName?.toLowerCase() === n?.toLowerCase());
                  if (foundItem) break; // 찾았으면 반복 중단
              }
          }

          if (!foundItem) {
              console.warn(`WARN (match.js): 아이템 ${n} (매치 ${matchDetail.metadata.match_id.substring(0,8)}... 유닛 ${u.character_id}) TFT static 데이터에서 찾을 수 없음.`);
          }
          return { name: foundItem?.name || n, image_url: foundItem?.icon || null }; 
        });
        
        return {
          character_id: u.character_id,
          name: ch?.name || u.character_id, 
          image_url: ch?.tileIcon || null, 
          tier: u.tier, cost: ch?.cost || 0,
          items: processedItems,
        };
      });

      const processedTraits = (p.traits || [])
        .map(riotTrait => {
          const apiName = riotTrait.name;
          const currentCount = riotTrait.num_units || riotTrait.tier_current || 0;

          const styleInfo = getTraitStyleInfo(apiName, currentCount, tft);
          
          if (!styleInfo) {
              console.warn(`WARN (match.js): 특성 ${riotTrait.name} (매치 ${matchDetail.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음. styleInfo is null.`);
              return null;
          }

          return {
              name: styleInfo.name,
              apiName: styleInfo.apiName,
              image_url: styleInfo.image_url,
              tier_current: styleInfo.tier_current,
              style: styleInfo.style,
              styleOrder: styleInfo.styleOrder,
              color: styleInfo.color,
              currentThreshold: styleInfo.currentThreshold,
              nextThreshold: styleInfo.nextThreshold,
          };
      })
      .filter(Boolean)
      .filter(t => t.style !== 'inactive');

      processedTraits.sort((a, b) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));
      
      return { ...p, units, traits: processedTraits };
    });

    const responsePayload = {
      ...matchDetail,
      info: {
        ...matchDetail.info,
        participants: processedParticipants,
        accounts: Object.fromEntries(accounts),
      }
    };

    res.json(responsePayload);

  } catch (err) {
    next(err);
  }
});

export default router;