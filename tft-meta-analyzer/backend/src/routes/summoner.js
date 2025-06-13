import express from 'express';
import { getAccountByRiotId, getSummonerByPuuid, getLeagueEntriesBySummonerId, getMatchIdsByPUUID, getMatchDetail } from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine } = req.query;
  
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      return res.status(503).json({ error: 'TFT 데이터를 로딩할 수 없습니다.' });
    }

    // 1. gameName과 tagLine으로 계정 정보(puuid 등) 조회
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;
    
    // 2. puuid로 소환사 정보(암호화된 id, 프로필 아이콘 등) 조회
    const summonerData = await getSummonerByPuuid(puuid);

    // 3. 암호화된 summonerId로 랭크 정보(티어, LP 등) 조회
    const leagueEntry = await getLeagueEntriesBySummonerId(summonerData.id);

    // 4. puuid로 최근 10게임 매치 ID 조회
    const matchIds = await getMatchIdsByPUUID(puuid, 10);
    
    // 5. 각 매치 상세 정보 조회 및 가공
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
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
    
            const traits = participant.traits.filter(t => t.style > 0).map(t => {
                const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
                return { name: traitInfo?.name || t.name, tier_current: t.tier_current, style: t.style };
            });
    
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

    // 6. 모든 정보를 취합하여 최종 응답 전송
    res.json({ 
        account: { ...account, ...summonerData },
        league: leagueEntry, 
        matches: processedMatches 
    });

  } catch (error) {
    next(error);
  }
});

export default router;