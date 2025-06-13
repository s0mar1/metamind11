import express from 'express';
import axios from 'axios';
// ⬇️⬇️⬇️ 필요한 모든 함수를 import 합니다. ⬇️⬇️⬇️
import { 
    getAccountByRiotId, 
    getMatchIdsByPUUID, 
    getMatchDetail, 
    getLeagueEntriesBySummonerId,
    getSummonerByPuuid 
} from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';


const router = express.Router();

// GET /api/summoner?region=kr&...
router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine } = req.query;
  const tftData = await getTFTData(); // 데이터 드래곤 데이터 로드

  if (!tftData) { return res.status(503).json({ error: '서버가 아직 TFT 데이터를 로딩 중입니다.' }); }
  if (!region || !gameName || !tagLine) { return res.status(400).json({ error: 'region, gameName, tagLine 파라미터가 모두 필요합니다.' }); }

  try {
    // 1. gameName과 tagLine으로 계정 정보(puuid 등) 조회
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;
    
    // 2. puuid로 소환사 정보(암호화된 id, 프로필 아이콘 등) 조회
    const summonerData = await getSummonerByPuuid(puuid);

    // 3. 암호화된 summonerId로 랭크 정보(티어, LP 등) 조회
    const leagueEntry = await getLeagueEntriesBySummonerId(summonerData.id);

    // 4. puuid로 최근 10게임 매치 ID 조회
    const matchIds = await getMatchIdsByPUUID(puuid, 10);
    if (!matchIds) { 
        return res.json({ account: {...account, ...summonerData}, league: leagueEntry, matches: [] }); 
    }

    // 5. 각 매치 상세 정보 조회 및 가공
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const matchDetails = [];
    for (const matchId of matchIds.slice(0, 10)) { // 최대 10개만
      const detail = await getMatchDetail(matchId);
      matchDetails.push(detail);
      await delay(120);
    }

    const processedMatches = matchDetails.map(match => {
      const participant = match.info.participants.find(p => p.puuid === puuid);
      if (!participant) return null;
      
      const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
      
      const units = participant.units.map(unit => {
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
        const items = unit.itemNames.map(itemName => {
            const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
            return { name: itemInfo?.name || '', image_url: itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon}` : null };
        });
        return {
            name: champInfo?.name || '', image_url: champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon}` : null,
            tier: unit.tier, cost: champInfo?.cost || 0, items: items,
        };
      });

      const traits = participant.traits.filter(t => t.style > 0).map(t => {
          const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
          return { name: traitInfo?.name || '', image_url: traitInfo?.icon ? `${cdnBaseUrl}${traitInfo.icon}` : null, tier_current: t.tier_current, style: t.style, };
      });

      return {
        matchId: match.metadata.match_id, game_datetime: match.info.game_datetime, placement: participant.placement, last_round: participant.last_round, units, traits, level: participant.level
      };
    }).filter(Boolean);

    // 6. 모든 정보를 취합하여 최종 응답 전송
    res.json({ 
        account: { ...account, ...summonerData }, // 계정 정보와 소환사 정보를 합쳐서 전달
        league: leagueEntry, 
        matches: processedMatches 
    });

  } catch (error) {
    next(error);
  }
});

export default router;