// backend/src/routes/summoner.js

import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
  getMatchIdsByPUUID,
  getMatchDetail,
} from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';
import SummonerData from '../models/SummonerData.js'; // ⭐️ 신규 모델 import

const router = express.Router();

router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine, forceRefresh } = req.query;

  if (!region || !gameName || !tagLine) {
    return res.status(400).json({ message: 'Region, gameName, and tagLine query parameters are required.' });
  }

  try {
    // 1. PUUID는 항상 먼저 조회하여 사용자를 식별합니다.
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;

    // 2. ⭐️ 캐싱 로직: 강제 갱신이 아니고, 캐시된 데이터가 있는지 확인
    if (forceRefresh !== 'true') {
      const cachedData = await SummonerData.findOne({ puuid });
      if (cachedData) {
        console.log(`INFO: Cache hit for ${gameName}#${tagLine}. Returning cached data.`);
        return res.json(cachedData);
      }
    }
    
    // 3. 캐시가 없거나 강제 갱신 시, Riot API로부터 신규 데이터 가져오기
    console.log(`INFO: Cache miss or force refresh for ${gameName}#${tagLine}. Fetching from Riot API.`);
    const summoner = await getSummonerByPuuid(puuid);
    const leagueEntries = await getLeagueEntriesBySummonerId(summoner.id);
    const matchIds = await getMatchIdsByPUUID(puuid, 10);

    const matchDetails = [];
    for (const matchId of matchIds) {
      const detail = await getMatchDetail(matchId);
      matchDetails.push(detail);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const tftData = await getTFTData();
    if (!tftData) throw new Error('Failed to load TFT Data Dragon data.');
    
    // (이하 데이터 가공 로직은 이전과 동일)
    const processedMatches = matchDetails.map(match => {
        const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
        const processedParticipants = match.info.participants.map(participant => {
            const units = (participant.units || []).map(unit => {
                const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
                const items = (unit.itemNames || []).map(itemName => {
                    const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
                    return { name: itemInfo?.name || '', image_url: itemInfo ? cdnBaseUrl + itemInfo.icon.toLowerCase().replace('.tex', '.png') : null };
                });
                return { name: champInfo?.name || '', image_url: champInfo ? cdnBaseUrl + champInfo.tileIcon.toLowerCase().replace('.tex', '.png') : null, tier: unit.tier, cost: champInfo?.cost || 0, items };
            });
            const traits = (participant.traits || []).filter(t => t.style > 0).map(t => {
                const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
                return { name: traitInfo?.name || t.name, image_url: traitInfo ? cdnBaseUrl + traitInfo.icon.toLowerCase().replace('.tex', '.png') : null, tier_current: t.tier_current, style: t.style };
            });
            const augments = (participant.augments || []).map(augName => {
                const augInfo = tftData.items.find(i => i.apiName === augName);
                return { name: augInfo?.name || augName, image_url: augInfo ? cdnBaseUrl + augInfo.icon.toLowerCase().replace('.tex', '.png') : null };
            });
            return { ...participant, units, traits, augments };
        });
        const selfParticipant = processedParticipants.find(p => p.puuid === puuid);
        if (!selfParticipant) return null;
        return {
            matchId: match.metadata.match_id,
            info: { ...match.info, participants: processedParticipants },
            placement: selfParticipant.placement,
            last_round: selfParticipant.last_round,
            level: selfParticipant.level,
            units: selfParticipant.units,
            traits: selfParticipant.traits,
            queue_id: match.info.queue_id,
            game_datetime: match.info.game_datetime,
        };
    }).filter(Boolean);

    const fullDataPayload = {
        account: {
            gameName: account.gameName,
            tagLine: account.tagLine,
            puuid: account.puuid,
            profileIconId: summoner.profileIconId,
        },
        league: leagueEntries,
        matches: processedMatches,
    };

    // 4. ⭐️ 가져온 최신 정보를 DB에 저장 (upsert: true로 데이터가 없으면 생성, 있으면 덮어쓰기)
    const updatedSummonerData = await SummonerData.findOneAndUpdate(
      { puuid },
      { 
        puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        data: fullDataPayload,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(updatedSummonerData);

  } catch (error) {
    next(error);
  }
});

export default router;