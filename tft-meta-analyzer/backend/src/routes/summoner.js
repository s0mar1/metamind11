import express from 'express';
import { getAccountByRiotId, getSummonerByPuuid, getLeagueEntriesBySummonerId, getMatchIdsByPUUID, getMatchDetail } from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';
import NodeCache from 'node-cache';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 600 }); // 10분 캐시

router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine, forceRefresh } = req.query;
  const cacheKey = `${gameName}#${tagLine}`;

  if (forceRefresh !== 'true') {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`INFO: Cache hit for ${cacheKey}. Returning cached data.`);
      return res.json(cachedData);
    }
  }

  console.log(`INFO: Cache miss or force refresh for ${cacheKey}. Fetching from Riot API.`);
  
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      return res.status(503).json({ error: 'TFT 데이터를 로딩할 수 없습니다.' });
    }

    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;
    
    const summonerData = await getSummonerByPuuid(puuid);
    const leagueEntry = await getLeagueEntriesBySummonerId(summonerData.id);
    const matchIds = await getMatchIdsByPUUID(puuid, 10);
    
    let processedMatches = [];

    if (matchIds && matchIds.length > 0) {
      const matchDetails = await Promise.all(
        matchIds.map(matchId => getMatchDetail(matchId).catch(e => null))
      );

      processedMatches = matchDetails.filter(Boolean).map(match => {
        const participant = match.info.participants.find(p => p.puuid === puuid);
        if (!participant) return null;
        
        const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
        
        const units = participant.units.map(unit => {
          const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
          return {
            name: champInfo?.name || unit.character_id,
            image_url: champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null,
            tier: unit.tier,
            cost: champInfo?.cost || 0,
            items: unit.itemNames.map(itemName => {
              const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
              return { name: itemInfo?.name || '', image_url: itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null };
            })
          };
        });

        const traits = participant.traits.map(t => {
            const traitInfo = tftData.traits.find(dt => dt.apiName.toLowerCase() === t.name.toLowerCase());
            if (!traitInfo || !traitInfo.sets) return null;

            let styleName = 'none';
            const styleOrderMap = { bronze: 1, silver: 2, gold: 3, chromatic: 4, prismatic: 4 };
            let styleOrder = 0;

            for (const set of traitInfo.sets) {
                if (t.num_units >= set.min) {
                    styleName = set.style.toLowerCase();
                    styleOrder = styleOrderMap[styleName] || 0;
                }
            }

            if (styleOrder === 0) return null;

            return {
                name: traitInfo.name,
                image_url: traitInfo.icon ? `${cdnBaseUrl}${traitInfo.icon.toLowerCase().replace('.tex', '.png')}` : null,
                tier_current: t.num_units,
                style: styleName,
                styleOrder: styleOrder,
 traitInfo.name,
                image_url: traitInfo.icon ? `${cdnBaseUrl}${traitInfo.icon.toLowerCase().replace('.tex', '.png')}` : null,
                tier_current: t.num_units,
                style: styleOrder, // 숫자 등급
            };
        }).filter(t => t && t.style > 0);

        return {
          matchId: match.metadata.match_id,
          game_datetime: match.info.game_datetime,
          placement: participant.placement,
          last_round: participant.last_round,
          level: participant.level,
          units,
          traits,
        };
      }).filter(Boolean);
    }

    const finalData = { 
      account: { ...account, ...summonerData },
      league: leagueEntry, 
      matches: processedMatches 
    };

    cache.set(cacheKey, finalData);
    console.log(`INFO: New data for ${cacheKey} saved to cache.`);
    
    res.json(finalData);

  } catch (error) {
    next(error);
  }
});

export default router;