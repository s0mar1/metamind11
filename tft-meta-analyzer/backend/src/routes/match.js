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

    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.length || !tft.krNameMap) {
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
          const it = tft.items.find(i => i.apiName?.toLowerCase() === n?.toLowerCase());
          if (!it) {
              console.warn(`WARN (match.js): 아이템 ${n} (매치 ${matchDetail.metadata.match_id.substring(0,8)}... 유닛 ${u.character_id}) TFT static 데이터에서 찾을 수 없음.`);
          }
          return { name: it?.name || n, image_url: it?.icon || null }; 
        });
        
        console.log(`DEBUG (match.js): Unit ${u.character_id} - ItemNames from Riot:`, u.itemNames);
        console.log(`DEBUG (match.js): Unit ${u.character_id} - Processed Items:`, processedItems);

        return {
          character_id: u.character_id,
          name: ch?.name || u.character_id, 
          image_url: ch?.tileIcon || null, 
          tier: u.tier, cost: ch?.cost || 0,
          items: processedItems,
        };
      });

      console.log(`DEBUG (match.js): Riot original traits for participant:`, p.traits);
      
      const processedTraits = (p.traits || [])
        .map(riotTrait => {
          const apiName = riotTrait.name;
          const currentCount = riotTrait.num_units || riotTrait.tier_current || 0;

          console.log(`DEBUG_TRAIT_PROCESS (match.js): Processing Riot Trait: ${apiName}, Raw Count (num_units): ${riotTrait.num_units}, Raw Count (tier_current): ${riotTrait.tier_current}, Final currentCount: ${currentCount}`);
          const styleInfo = getTraitStyleInfo(apiName, currentCount, tft);
          
          if (!styleInfo) {
              console.warn(`WARN (match.js): 특성 ${riotTrait.name} (매치 ${matchDetail.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음. styleInfo is null.`);
              return null;
          }
          console.log(`DEBUG_TRAIT_PROCESS (match.js): Processed StyleInfo for ${apiName}:`, styleInfo);

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
      
      console.log(`DEBUG (match.js): Processed Traits:`, processedTraits);

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