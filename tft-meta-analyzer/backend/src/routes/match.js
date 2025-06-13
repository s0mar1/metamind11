// backend/src/routes/match.js
import express from 'express';
import { getMatchDetail } from '../services/riotApi.js';
// ⭐️ 수정된 부분: 함수 이름을 getTFTData (대문자 T)로 정확하게 import 합니다.
import getTFTData from '../services/tftData.js';

const router = express.Router();

router.get('/:matchId', async (req, res, next) => {
  const { matchId } = req.params;

  try {
    // ⭐️ 수정된 부분: import한 이름과 동일하게 getTFTData()를 호출합니다.
    const tftData = await getTFTData();
    if (!tftData) {
        throw new Error("TFT static data could not be loaded.");
    }
    
    const matchDetail = await getMatchDetail(matchId);
    
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