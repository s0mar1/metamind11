import express from 'express';
import axios from 'axios';
import { getMatchDetail } from '../services/riotApi.js';

const router = express.Router();

// 데이터 드래곤 데이터 로딩 로직은 summoner.js에서 이미 처리하므로, 여기서는 tftData를 직접 가져올 수 없습니다.
// 대신, 다시 로드하거나 더 나은 구조에서는 별도의 모듈로 분리해야 합니다.
// 지금은 간단하게, 데이터 로딩 상태만 체크하고 데이터는 summoner.js의 것을 재활용하는 것처럼 가정합니다.
// (실제로는 summoner.js에서 로드한 tftData를 이 파일에서 직접 접근할 수 없습니다. 이 부분은 나중에 리팩토링이 필요합니다.)
// 지금은 임시로, summoner.js와 동일한 데이터 로딩 로직을 여기에 복사하여 독립적으로 동작하게 만듭니다.

let tftData = null;
const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';
async function loadTFTData() { 
  if (tftData) return; // 이미 로딩되었다면 다시 실행하지 않음
  try { 
    console.log('(Match Route) 최신 TFT 데이터를 불러오는 중입니다...'); 
    const response = await axios.get(TFT_DATA_URL); 
    const currentSet = '14'; 
    tftData = { 
      items: response.data.items, 
      champions: response.data.sets[currentSet].champions, 
      traits: response.data.sets[currentSet].traits, 
    };
    console.log(`(Match Route) TFT 시즌 ${currentSet} 데이터 로딩 성공!`); 
  } catch (error) { 
    console.error('(Match Route) TFT 데이터 로딩 실패:', error.message); 
  } 
}
loadTFTData();


router.get('/:matchId', async (req, res, next) => {
  const { matchId } = req.params;

  if (!tftData) {
    return res.status(503).json({ error: '서버가 아직 TFT 데이터를 로딩 중입니다.' });
  }

  try {
    const matchDetail = await getMatchDetail(matchId);

    // 이제 한 명이 아닌, 모든 참가자(participants)의 데이터를 가공합니다.
    const processedParticipants = matchDetail.info.participants.map(participant => {
      const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
      
      const units = participant.units.map(unit => {
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
        const items = unit.itemNames.map(itemName => {
            const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
            const imageUrl = itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
            return { name: itemInfo ? itemInfo.name : itemName, image_url: imageUrl };
        });
        const champImageUrl = champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null;
        return {
            name: champInfo ? champInfo.name : unit.character_id, image_url: champImageUrl, tier: unit.tier, cost: champInfo ? champInfo.cost : 0, items: items,
        };
      });

      const traits = participant.traits.filter(t => t.style > 0).map(t => {
          const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
          const traitImageUrl = traitInfo?.icon ? `${cdnBaseUrl}${traitInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
          return {
              name: traitInfo ? traitInfo.name : t.name, image_url: traitImageUrl, tier_current: t.tier_current, style: t.style,
          };
      });

      // 각 참가자의 puuid와 다른 정보들도 함께 반환합니다.
      return {
        puuid: participant.puuid,
        placement: participant.placement,
        last_round: participant.last_round,
        level: participant.level,
        players_eliminated: participant.players_eliminated,
        total_damage_to_players: participant.total_damage_to_players,
        units: units,
        traits: traits,
      };
    });

    // 원래 매치 정보에 가공된 참가자 정보를 덮어씁니다.
    const finalMatchData = {
      ...matchDetail,
      info: {
        ...matchDetail.info,
        participants: processedParticipants,
      }
    };

    res.json(finalMatchData);

  } catch (error) {
    next(error);
  }
});

export default router;