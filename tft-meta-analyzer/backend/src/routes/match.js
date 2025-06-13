import express from 'express';
import { getMatchDetail, getAccountByPuuid } from '../services/riotApi.js';
import getTFTData from '../services/tftData.js';

const router = express.Router();

router.get('/:matchId', async (req, res, next) => {
  const { matchId } = req.params;

  try {
    const tftData = await getTFTData();
    if (!tftData) return res.status(503).json({ error: '서버가 TFT 데이터를 로딩 중입니다.' });

    const matchDetail = await getMatchDetail(matchId);
    
    // ⬇️⬇️⬇️ 각 참가자의 puuid로 계정 정보를 조회하는 로직 추가 ⬇️⬇️⬇️
    const participantPuids = matchDetail.info.participants.map(p => p.puuid);
    const accountPromises = participantPuids.map(puuid => getAccountByPuuid(puuid).catch(() => null));
    const accounts = await Promise.all(accountPromises);
    
    const accountsMap = accounts.filter(Boolean).reduce((acc, account) => {
        acc[account.puuid] = account;
        return acc;
    }, {});

    const processedParticipants = matchDetail.info.participants.map(participant => {
      const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
      const units = participant.units.map(unit => {
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
        return {
            name: champInfo?.name || unit.character_id,
            image_url: champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null,
            tier: unit.tier, cost: champInfo?.cost || 0,
            items: unit.itemNames.map(itemName => {
                const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemName.toLowerCase());
                return { name: itemInfo?.name || '', image_url: itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null };
            })
        };
      });
      const traits = participant.traits.map(t => {
          const traitInfo = tftData.traits.find(trait => trait.apiName.toLowerCase() === t.name.toLowerCase());
          return { name: traitInfo?.name || t.name, image_url: traitInfo?.icon ? `${cdnBaseUrl}${traitInfo.icon.toLowerCase().replace('.tex', '.png')}` : null, tier_current: t.tier_current, style: t.style, };
      });
      return { ...participant, units, traits };
    });

    const finalMatchData = {
      ...matchDetail,
      info: {
        ...matchDetail.info,
        participants: processedParticipants,
        accounts: accountsMap, // ⬅️ puuid를 키로 하는 계정 정보 맵 추가
      }
    };

    res.json(finalMatchData);
  } catch (error) {
    next(error);
  }
});

export default router;