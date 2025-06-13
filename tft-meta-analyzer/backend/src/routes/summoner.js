/* -------------------------------------------------------------------------- */
/*  MetaMind TFT – 소환사 상세 API                                            */
/* -------------------------------------------------------------------------- */
import express from 'express';
import cache   from 'memory-cache';

import {
  getAccountByRiotId,
  getMatchIdsByPUUID,
  getMatchDetail,
} from '../services/riotApi.js';

import getTFTData     from '../services/tftData.js';
import { formatMatch } from '../utils/formatMatch.js';

const router = express.Router();

/* GET /summoner?name=닉네임&tag=KR1&forceRefresh=true */
 router.get('/', async (req, res) => {
   /* gameName / tagLine 로도 들어올 수 있으니 둘 다 체크 */
     const gameName   = req.query.name || req.query.gameName;
     const tagLine    = req.query.tag  || req.query.tagLine;
     const forceRefresh = req.query.forceRefresh;
   if (!gameName || !tagLine) {
    // 클라이언트가 name, tag 둘 중 하나라도 안 보냈을 때 400 Bad Request 반환
     return res.status(400).json({
       error: 'Query params "name" and "tag" are both required. ' +
             '예: /summoner?name=HideOnBush&tag=KR1',
     });
  }
  const cacheKey = `${gameName}#${tagLine}`;

  try {
    /* 1) 캐시 */
    if (!forceRefresh && cache.get(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    /* 2) 프로필(PUUID) */
    let profile;
    try {
      profile = await getAccountByRiotId(gameName, tagLine);
    } catch (e) {
      if (e.response?.status === 404) {
        return res.status(404).json({ error: 'Summoner not found' });
      }
      throw e;
    }
    const { puuid } = profile;

    /* 3) 매치 ID */
    const matchIds = await getMatchIdsByPUUID(puuid, 5);

    /* 4) 매치 상세 + TFT 데이터 병렬 */
    const [rawMatches, tftData] = await Promise.all([
      Promise.all(matchIds.map((id) => getMatchDetail(id))),
      getTFTData(), // { traits, champions, items, currentSet }
    ]);
    const { traits: traitMeta, currentSet } = tftData;
    const cdnBaseUrl = `https://cdn.communitydragon.org/${currentSet}`;

    /* 5) 매치 가공 */
    const styleOrderMap = { bronze: 1, silver: 2, gold: 3, chromatic: 4, prismatic: 4 };

    const matches = rawMatches.map((match) => {
      const info        = match.info;
      const participant = info.participants.find((p) => p.puuid === puuid);

      /* 특성(시너지) 매핑 */
      const traits = participant.traits
        .map((t) => {
          const meta = traitMeta.find(
            (m) => m.apiName.toLowerCase() === t.name.toLowerCase(),
          );
          if (!meta) return null;

          const levels = meta.sets || meta.levels || meta.tiers || [];
          let styleName = 'none';
          let styleOrder = 0;

          for (const lv of levels) {
            if (t.num_units >= lv.min) {
              styleName  = lv.style.toLowerCase();
              styleOrder = styleOrderMap[styleName] || 0;
            }
          }
          if (styleOrder === 0) return null;

          return {
            name: meta.name,
            image_url: meta.icon
              ? `${cdnBaseUrl}${meta.icon.toLowerCase().replace('.tex', '.png')}`
              : null,
            tier_current: t.num_units,
            style      : styleName,
            styleOrder,
          };
        })
        .filter(Boolean);

      return formatMatch(info, participant, traits, cdnBaseUrl);
    });

    /* 6) 응답 + 캐싱 */
    const payload = { profile, matches };
    cache.put(cacheKey, payload, 1000 * 60 * 5);
    res.json(payload);
  } catch (err) {
    console.error('[summoner] error:', err);
    res.status(500).json({ error: 'Failed to fetch summoner data' });
  }
});

export default router;
