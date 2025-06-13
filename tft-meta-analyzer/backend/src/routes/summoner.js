import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
  getMatchIdsByPUUID,
  getMatchDetail,
} from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';
import NodeCache from 'node-cache';

const router = express.Router();
const cache  = new NodeCache({ stdTTL: 600 });       // 10 분 캐시

//-------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine, forceRefresh } = req.query;
  if (!region || !gameName || !tagLine) {
    return res.status(400).json({ error: 'region, gameName, tagLine 필요' });
  }

  const cacheKey = `${region}:${gameName}#${tagLine}`;
  if (forceRefresh !== 'true') {
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);
  }

  try {
    /* ① TFT static 데이터 */
    const tftData = await getTFTData();          // { items, champions, traits, currentSet }
    if (!tftData) {
      return res.status(503).json({ error: 'TFT 데이터 로드 실패' });
    }

    /* ② 소환사 정보 */
    const account      = await getAccountByRiotId(gameName, tagLine);
    const { puuid }    = account;
    const summonerData = await getSummonerByPuuid(puuid);
    const leagueEntry  = await getLeagueEntriesBySummonerId(summonerData.id);

    /* ③ 최근 매치 10개 */
    const matchIds = await getMatchIdsByPUUID(puuid, 10);
    const matches  = [];

    if (matchIds?.length) {
      const details = await Promise.all(
        matchIds.map(id => getMatchDetail(id).catch(() => null)),
      );

      for (const match of details.filter(Boolean)) {
        const me = match.info.participants.find(p => p.puuid === puuid);
        if (!me) continue;

        const cdn = 'https://raw.communitydragon.org/latest/game/';

        /* ─ 유닛 가공 ─ */
        const units = me.units.map(u => {
          const champ = tftData.champions.find(
            c => c.apiName.toLowerCase() === u.character_id.toLowerCase(),
          );
          return {
            name     : champ?.name || u.character_id,
            image_url: champ?.tileIcon
              ? `${cdn}${champ.tileIcon.toLowerCase().replace('.tex', '.png')}`
              : null,
            tier : u.tier,
            cost : champ?.cost || 0,
            items: u.itemNames.map(itemApi => {
              const it = tftData.items.find(
                i => i.apiName.toLowerCase() === itemApi.toLowerCase(),
              );
              return {
                name     : it?.name || '',
                image_url: it?.icon
                  ? `${cdn}${it.icon.toLowerCase().replace('.tex', '.png')}`
                  : null,
              };
            }),
          };
        });

        /* ─ 특성 가공 ─ */
        const styleRank = { bronze:1, silver:2, gold:3, platinum:3, emerald:3,
                            chromatic:4, prismatic:4 };
        const num2key   = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
        const styleNames= ['none', 'bronze', 'silver', 'gold', 'prismatic'];

        const traits = me.traits
          .map(t => {
            const info = tftData.traits.find(
              dt => dt.apiName.toLowerCase() === t.name.toLowerCase(),
            );
            const unitsCnt = t.num_units ?? t.tier_current ?? 0;
            if (!info || !Array.isArray(info.sets) || info.sets.length === 0 || unitsCnt === 0) {
              return null;
            }

            /* styleName / styleOrder 결정 */
            let styleName  = 'inactive';
            let styleOrder = 0;
            for (const s of info.sets) {
              if (unitsCnt >= s.min) {
                styleName = typeof s.style === 'string'
                  ? s.style.toLowerCase()
                  : styleNames[s.style] || 'bronze';
                styleOrder = styleRank[styleName] || 0;
              }
            }

            /* 색상(hex) 추출 */
            const styleHex = info.sets.find(s => {
              const sn = typeof s.style === 'string'
                ? s.style.toLowerCase()
                : styleNames[s.style];
              return sn === styleName;
            })?.styleHexColor || '#4B5563';

            /* 아이콘 경로 */
            const toPng = p => p.toLowerCase().replace(/\.(tex|dds)$/, '.png');
            const iconPath = info.icon
              ? `${cdn}${toPng(info.icon)}`
              : `${cdn}assets/ux/traiticons/trait_icon_${tftData.currentSet}_${
                  info.name.toLowerCase().replace(/\s+/g, '')
                }.png`;

            return {
              name        : info.name,
              image_url   : iconPath,
              tier_current: unitsCnt,
              style       : styleName,
              styleOrder  : styleOrder,
              color       : styleHex,
            };
          })
          .filter(Boolean);

        matches.push({
          matchId      : match.metadata.match_id,
          game_datetime: match.info.game_datetime,
          placement    : me.placement,
          last_round   : me.last_round,
          level        : me.level,
          units,
          traits,
        });
      }
    }

    /* ④ 응답 */
    const payload = {
      account: { ...account, ...summonerData },
      league : leagueEntry,
      matches,
    };
    cache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
