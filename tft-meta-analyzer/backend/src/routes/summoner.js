// backend/src/routes/summoner.js

import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getMatchIdsByPUUID,
  getMatchDetail,
  getLeagueEntriesByPuuid,
} from '../services/riotApi.js';
import getTFTData, { getTraitStyleInfo } from '../services/tftData.js';
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
    // 💡 수정: tft.items?.completed?.length (예시)로 데이터를 검사
    //    tft.items가 객체이므로, 특정 카테고리 배열이 비어있지 않은지 확인
    if (!tft || !tft.traitMap?.size || !tft.champions?.length || !tft.items?.completed?.length || !tft.krNameMap) {
      console.error('TFT static 데이터 로드 실패 또는 불완전:', tft);
      return res.status(503).json({ error:'TFT static 데이터가 완전하지 않습니다. 서버 로그를 확인해주세요.' });
    }

    const account      = await getAccountByRiotId(gameName, tagLine, region);
    const summonerInfo = await getSummonerByPuuid(account.puuid, region);
    let leagueEntry = null;
    if (summonerInfo && summonerInfo.puuid) {
      try {
        leagueEntry = await getLeagueEntriesByPuuid(summonerInfo.puuid, region);
      } catch (error) {
        console.error(`ERROR: getLeagueEntriesByPuuid failed:`, error.message);
      }
    } else {
      console.warn(`WARN: summonerInfo 또는 summonerInfo.puuid가 유효하지 않아 리그 엔트리를 가져올 수 없습니다. summonerInfo:`, summonerInfo);
    }

    const ids     = await getMatchIdsByPUUID(account.puuid, 10, region);
    const matches = [];
    if (Array.isArray(ids) && ids.length) {
      const raws = [];
      for (const id of ids) {
          try {
              const detail = await getMatchDetail(id, region);
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
                console.warn(`WARN: 아이템 ${n} (매치 ${match.metadata.match_id.substring(0,8)}... 유닛 ${u.character_id}) TFT static 데이터에서 찾을 수 없음.`);
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
        
        const processedTraits = (me.traits || []).map(riotTrait => {
            const apiName = riotTrait.name;
            const currentCount = riotTrait.num_units || riotTrait.tier_current || 0; // num_units 우선

            const styleInfo = getTraitStyleInfo(apiName, currentCount, tft);
            
            if (!styleInfo) {
                console.warn(`WARN: 특성 ${riotTrait.name} (매치 ${match.metadata.match_id.substring(0,8)}...) TFT static 데이터에서 찾을 수 없음. styleInfo is null.`);
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
        }).filter(Boolean);

        processedTraits.sort((a, b) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));
        
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