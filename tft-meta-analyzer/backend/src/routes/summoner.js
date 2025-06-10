import express from 'express';
import axios from 'axios';
import { getAccountByRiotId, getMatchIdsByPUUID, getMatchDetail } from '../services/riotApi.js';

const router = express.Router();

// 데이터 드래곤 로딩 로직 (변경 없음)
let tftData = null;
const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';
async function loadTFTData() { try { console.log('최신 TFT 데이터를 불러오는 중입니다...'); const response = await axios.get(TFT_DATA_URL); const currentSet = '14'; tftData = { items: response.data.items, champions: response.data.sets[currentSet].champions, traits: response.data.sets[currentSet].traits, }; console.log(`TFT 시즌 ${currentSet} 데이터 로딩 성공!`); } catch (error) { console.error('TFT 데이터 로딩 실패:', error.message); } }
loadTFTData();

router.get('/', async (req, res, next) => {
  const { region, gameName, tagLine } = req.query;
  if (!tftData) { return res.status(503).json({ error: '서버가 아직 TFT 데이터를 로딩 중입니다.' }); }
  if (!region || !gameName || !tagLine) { return res.status(400).json({ error: 'region, gameName, tagLine 파라미터가 모두 필요합니다.' }); }

  try {
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;
    const matchIds = await getMatchIdsByPUUID(puuid, 10);
    if (!matchIds || matchIds.length === 0) { return res.json({ account, matches: [] }); }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const matchDetails = [];
    for (const matchId of matchIds) {
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
            const imageUrl = itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
            return { name: itemInfo ? itemInfo.name : itemName, image_url: imageUrl };
        });
        
        // ⬇️⬇️⬇️ 아이콘 경로를 tileIcon으로 변경하고, cost 정보를 추가합니다. ⬇️⬇️⬇️
        const champImageUrl = champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null;
        return {
            name: champInfo ? champInfo.name : unit.character_id,
            image_url: champImageUrl,
            tier: unit.tier,
            cost: champInfo ? champInfo.cost : 0, // 코스트 정보 추가
            items: items,
        };
      });

      const traits = participant.traits.filter(t => t.style > 0).map(t => {
          const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
          const traitImageUrl = traitInfo?.icon ? `${cdnBaseUrl}${traitInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
          return {
              name: traitInfo ? traitInfo.name : t.name, image_url: traitImageUrl, tier_current: t.tier_current, style: t.style,
          };
      });

      return {
        matchId: match.metadata.match_id, game_datetime: match.info.game_datetime, placement: participant.placement, last_round: participant.last_round, units: units, traits: traits,
      };
    }).filter(Boolean);

    res.json({ account, matches: processedMatches });
  } catch (error) {
    next(error);
  }
});

export default router;