// backend/src/routes/summoner.js

import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
  getMatchIdsByPUUID,
  getMatchDetail,
} from '../services/riotApi.js';
import getTFTData, { getTraitStyleInfo } from '../services/tftData.js'; // getTraitStyleInfo import
import NodeCache  from 'node-cache';

const router = express.Router();
const cache  = new NodeCache({ stdTTL: 600 });

router.get('/', async (req, res, next) => {
  try {
    const { region, gameName, tagLine, forceRefresh } = req.query;
    if (!region || !gameName || !tagLine)
      return res.status(400).json({ error:'region, gameName, tagLine 필요' });

    const cacheKey = `${region}:${gameName}#${tagLine}`;
    if (forceRefresh !== 'true') {
      const hit = cache.get(cacheKey);
      if (hit) return res.json(hit);
    }

    const tft = await getTFTData();
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.length || !tft.krNameMap) {
      console.error('TFT static 데이터 로드 실패 또는 불완전:', tft);
      return res.status(503).json({ error:'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }

    const account      = await getAccountByRiotId(gameName, tagLine);
    const summonerInfo = await getSummonerByPuuid(account.puuid);
    const leagueEntry  = await getLeagueEntriesBySummonerId(summonerInfo.id);
    const ids     = await getMatchIdsByPUUID(account.puuid, 10);
    const matches = [];

    if (Array.isArray(ids) && ids.length) {
      const raws = [];
      for (const id of ids) {
          try {
              const detail = await getMatchDetail(id);
              raws.push(detail);
              await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (detailError) {
              console.warn(`WARN: 매치 ${id.substring(0, 8)}... 상세 정보 가져오기 실패: ${detailError.message}`);
              raws.push(null);
              await new Promise(resolve => setTimeout(resolve, 1500));
          }
      }

      for (const match of raws.filter(Boolean)) {
        const me = match.info.participants.find(p => p.puuid === account.puuid);
        if (!me) continue;

        const units = me.units.map(u => {
          const ch = tft.champions.find(c => c.apiName?.toLowerCase() === u.character_id?.toLowerCase());
          if (!ch) {
            console.warn(`WARN: 챔피언 ${u.character_id} (매치 ${match.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음.`);
          }
          
          const processedItems = (u.itemNames || []).map(n => {
            const it = tft.items.find(i => i.apiName?.toLowerCase() === n?.toLowerCase());
            if (!it) {
                console.warn(`WARN: 아이템 ${n} (매치 ${match.metadata.match_id.substring(0,8)}... 유닛 ${u.character_id}) TFT static 데이터에서 찾을 수 없음.`);
            }
            return { name: it?.name || n, image_url: it?.icon || null }; 
          });
          
          console.log(`DEBUG: Unit ${u.character_id} - ItemNames from Riot:`, u.itemNames);
          console.log(`DEBUG: Unit ${u.character_id} - Processed Items:`, processedItems);

          return {
            character_id: u.character_id,
            name: ch?.name || u.character_id, 
            image_url: ch?.tileIcon || null, 
            tier: u.tier, cost: ch?.cost || 0,
            items: processedItems,
          };
        });
        
        console.log(`DEBUG: Riot original traits for participant:`, me.traits);
        
        const processedTraits = (me.traits || []).map(riotTrait => {
            const apiName = riotTrait.name;
            const currentCount = riotTrait.num_units || riotTrait.tier_current || 0; // num_units 우선

            console.log(`DEBUG_TRAIT_PROCESS: Processing Riot Trait: ${apiName}, Raw Count (num_units): ${riotTrait.num_units}, Raw Count (tier_current): ${riotTrait.tier_current}, Final currentCount: ${currentCount}`);
            const styleInfo = getTraitStyleInfo(apiName, currentCount, tft);
            
            if (!styleInfo) {
                console.warn(`WARN: 특성 ${riotTrait.name} (매치 ${match.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음. styleInfo is null.`);
                return null;
            }
            console.log(`DEBUG_TRAIT_PROCESS: Processed StyleInfo for ${apiName}:`, styleInfo);

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
        }).filter(Boolean);

        processedTraits.sort((a, b) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));
        
        console.log(`DEBUG: Processed Traits:`, processedTraits);

        matches.push({
          matchId: match.metadata.match_id, game_datetime: match.info.game_datetime,
          placement: me.placement, level: me.level,
          units, traits: processedTraits,
        });
      }
    }

    const payload = { account: { ...account, ...summonerInfo }, league: leagueEntry, matches };
    cache.set(cacheKey, payload);
    res.json(payload);

  } catch (err) {
    console.error('--- [중앙 에러 핸들러] ---');
    next(err);
  }
});

export default router;