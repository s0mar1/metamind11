// routes/summoner.js (진짜 최종 완성본)

import express from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
  getMatchIdsByPUUID,
  getMatchDetail,
} from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';
import NodeCache  from 'node-cache';

const router = express.Router();
const cache  = new NodeCache({ stdTTL: 600 });
const cdn    = 'https://raw.communitydragon.org/latest/game/';

const IDX2KEY     = ['inactive', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_ORDER = { bronze:1, silver:2, gold:3, prismatic:4, unique:4 };
const PALETTE = {
  bronze   : '#C67A32', silver   : '#BFC4CF', gold     : '#FFD667',
  prismatic: '#CFF1F1', unique   : '#FFA773',
};
const toPNG = p => p ? `${cdn}${p.toLowerCase().replace(/\.(tex|dds)$/ , '.png')}` : null;

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
    if (!tft || !tft.traitMap?.size) {
      return res.status(503).json({ error:'TFT static 데이터가 완전하지 않습니다.' });
    }

    const account      = await getAccountByRiotId(gameName, tagLine);
    const summonerInfo = await getSummonerByPuuid(account.puuid);
    const leagueEntry  = await getLeagueEntriesBySummonerId(summonerInfo.id);
    const ids     = await getMatchIdsByPUUID(account.puuid, 10);
    const matches = [];

    if (Array.isArray(ids) && ids.length) {
      const raws = await Promise.all(ids.map(id => getMatchDetail(id).catch(() => null)));

      for (const match of raws.filter(Boolean)) {
        const me = match.info.participants.find(p => p.puuid === account.puuid);
        if (!me) continue;

        const units = me.units.map(u => {
          const ch = tft.champions.find(c => c.apiName?.toLowerCase() === u.character_id?.toLowerCase());
          return {
            character_id: u.character_id,
            name: ch?.name || u.character_id, image_url: toPNG(ch?.tileIcon),
            tier: u.tier, cost: ch?.cost || 0,
            items: u.itemNames.map(n => {
              const it = tft.items.find(i => i.apiName?.toLowerCase() === n?.toLowerCase());
              return { name: it?.name || '', image_url: toPNG(it?.icon) };
            }),
          };
        });
        
        const traitCounts = new Map();
        for (const unit of me.units) {
            const champData = tft.champions.find(c => c.apiName?.toLowerCase() === unit.character_id?.toLowerCase());
            if (champData?.traits) {
                for (const traitName of champData.traits) {
                    traitCounts.set(traitName, (traitCounts.get(traitName) || 0) + 1);
                }
            }
        }

        const traits = [];
        for (const [traitName, count] of traitCounts.entries()) {
            const meta = tft.traitMap.get(traitName.toLowerCase());
            if (!meta) continue;

            const cnt = count;
            const rows = Array.isArray(meta.effects) ? meta.effects : [];

            // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
            //         [최종 버그 수정] r.min -> r.minUnits
            const active = rows.filter(r => cnt >= r.minUnits).sort((a, b) => b.minUnits - a.minUnits)[0] ?? null;
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            
            if (!active) continue;

            let styleKey = active ? (typeof active.style === 'string' ? active.style.toLowerCase() : IDX2KEY[active.style] || 'bronze') : 'bronze';
            
            // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
            //         [최종 버그 수정] r.min -> r.minUnits / active.min -> active.minUnits
            const topMin = rows.reduce((m, r) => Math.max(m, r.minUnits), 0);
            if (rows.length >= 4 && styleKey === 'prismatic' && active.minUnits < topMin) styleKey = 'gold';
            if (rows.length === 1 && rows[0].minUnits === 1) styleKey = 'unique';
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            const hex = (active?.styleHexColor?.trim()) ?? PALETTE[styleKey] ?? '#4B5563';
            const displayName = tft.krNameMap.get(meta.apiName.toLowerCase()) || meta.name;

            traits.push({
                name: displayName, image_url: toPNG(meta.icon),
                tier_current: cnt, style: styleKey,
                styleOrder: STYLE_ORDER[styleKey], color: hex,
            });
        }
        
        traits.sort((a, b) => (b.styleOrder - a.styleOrder) || (b.tier_current - a.tier_current));

        matches.push({
          matchId: match.metadata.match_id, game_datetime: match.info.game_datetime,
          placement: me.placement, level: me.level,
          units, traits,
        });
      }
    }

    const payload = { account: { ...account, ...summonerInfo }, league: leagueEntry, matches };
    cache.set(cacheKey, payload);
    res.json(payload);

  } catch (err) {
    next(err);
  }
});

export default router;