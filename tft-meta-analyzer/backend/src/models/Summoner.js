// === src/routes/summoner.js ===
import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPUUID,
  getSummonerByName,
  getMatchIdsByPUUID,
  getMatchDetails
} from '../services/riotApi.js';

// 플랫폼별 호스트 매핑
const PLATFORM_HOSTS = {
  kr:   'kr.api.riotgames.com',
  na1:  'na1.api.riotgames.com',
  euw1: 'euw1.api.riotgames.com',
  eune1:'eune1.api.riotgames.com'
};

const router = express.Router();

/**
 * GET /api/summoner/:region/:rawName
 * region: 'kr', 'na1', 'euw1', 'eune1'
 * rawName: encodeURIComponent(gameName#tagLine) or plain name
 */
router.get('/:region/:rawName', async (req, res) => {
  const { region, rawName } = req.params;
  console.log('🛠 [SummonerRoute] region:', region);
  console.log('🛠 [SummonerRoute] rawName (인코딩 전):', rawName);

  const decoded = decodeURIComponent(rawName);
  console.log('🛠 [SummonerRoute] decoded (인코딩 후):', decoded);

  let puuid;
  let summoner;

  try {
    if (decoded.includes('#')) {
      // Riot ID 체계: gameName#tagLine
      const [gameName, tagLine] = decoded.split('#');
      console.log('🛠 [SummonerRoute] gameName:', gameName, 'tagLine:', tagLine);

      // 1) Account-V1로 PUUID 조회
      const account = await getAccountByRiotId(region, gameName, tagLine);
      puuid = account.puuid;

      // 2) PUUID로 Summoner-V4 조회
      summoner = await getSummonerByPUUID(region, puuid);
    } else {
      // 이름만 사용하는 기존 방식
      summoner = await getSummonerByName(region, decoded);
      puuid     = summoner.puuid;
    }

    // 3) 최근 매치 ID 조회
    const matchIds = await getMatchIdsByPUUID(region, puuid, 10);

    // 4) 각 매치 상세 조회
    const matchesRaw = await Promise.all(
      matchIds.map(id => getMatchDetails(id, region))
    );

    // 5) 데이터 단순화하여 응답
    const matches = matchesRaw.map(m => {
      const participant = m.info.participants.find(p => p.puuid === puuid);
      return {
        id:        m.metadata.matchId,
        rank:      participant.individual_position || (participant.win ? 1 : 8),
        timestamp: m.info.gameStartTimestamp,
        champions: participant.champions || []
      };
    });

    res.json({ summoner, matches });
  } catch (err) {
    console.error('❌ [SummonerRoute] Riot API error:', err.response?.status, err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

export default router;
