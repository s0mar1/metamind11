import Match from '../src/models/Match.js';
import DeckTier from '../src/models/DeckTier.js';
import getTFTData from '../src/services/tftData.js';

const cleanTFTName = (name) => name ? name.replace(/^TFT\d*_/i, '') : 'Unknown';

const calculateTierRank = (averagePlacement, top4Rate) => {
    if (averagePlacement <= 4.15 && top4Rate >= 0.58) return { rank: 'S', order: 1 };
    if (averagePlacement <= 4.35 && top4Rate >= 0.53) return { rank: 'A', order: 2 };
    if (averagePlacement <= 4.55 && top4Rate >= 0.50) return { rank: 'B', order: 3 };
    if (averagePlacement <= 4.75 && top4Rate >= 0.45) return { rank: 'C', order: 4 };
    return { rank: 'D', order: 5 };
};

export const analyzeAndCacheDeckTiers = async (tftData) => {
  if (!tftData) { console.error('TFT 데이터가 없어 덱 분석을 중단합니다.'); return; }
  console.log('--- [최종] 덱 티어리스트 분석 작업 시작 ---');
  try {
    const allMatches = await Match.find({});
    const deckDataAggregator = {};

    allMatches.forEach(match => {
      match.info.participants.forEach(p => {
        if (!p || !Array.isArray(p.units) || !Array.isArray(p.traits)) return;

        const findChampInfo = (charId) => tftData.champions.find(c => c.apiName.toLowerCase() === charId.toLowerCase());
        
        let carryUnit = p.units.find(u => u.tier === 3 && u.itemNames?.length >= 2) || 
                        p.units.find(u => (u.cost >= 4 && u.tier >= 2 && u.itemNames?.length >= 2)) ||
                        [...p.units].sort((a, b) => (b.itemNames?.length || 0) - (a.itemNames?.length || 0))[0];

        if (!carryUnit || !carryUnit.character_id) return;
        
        const carryInfo = findChampInfo(carryUnit.character_id);
        if (!carryInfo) return;

        const coreTraits = p.traits.filter(t => t.style >= 2 && t.tier_current > 0).sort((a, b) => b.tier_current - a.tier_current);
        if (coreTraits.length < 1) return;
        
        const mainTraitInfo = tftData.traits.find(t => t.apiName.toLowerCase() === coreTraits[0].name.toLowerCase());
        const mainTraitName = mainTraitInfo ? mainTraitInfo.name : 'Unknown';
        
        const deckKey = `${mainTraitName} ${carryInfo.name}`;

        if (!deckDataAggregator[deckKey]) {
          deckDataAggregator[deckKey] = {
            mainTraitName,
            carryChampionName: carryInfo.name,
            placements: [],
            unitOccurrences: {}, // 덱에 포함된 모든 유닛 정보 (아이템 포함)
          };
        }

        deckDataAggregator[deckKey].placements.push(p.placement);
        p.units.forEach(unit => {
          const unitId = unit.character_id;
          if (!deckDataAggregator[deckKey].unitOccurrences[unitId]) {
            deckDataAggregator[deckKey].unitOccurrences[unitId] = { count: 0, items: [] };
          }
          deckDataAggregator[deckKey].unitOccurrences[unitId].count++;
          if (Array.isArray(unit.itemNames)) {
            deckDataAggregator[deckKey].unitOccurrences[unitId].items.push(...unit.itemNames);
          }
        });
      });
    });
    
    console.log(`[최종] 분석 완료. 총 ${Object.keys(deckDataAggregator).length}개의 고유한 덱 조합 발견.`);

    for (const key in deckDataAggregator) {
      const deckData = deckDataAggregator[key];
      const totalGames = deckData.placements.length;
      if (totalGames < 3) continue; // 최소 3게임 이상 데이터만 통계에 포함

      const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';

      const coreUnits = Object.entries(deckData.unitOccurrences)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([apiName, unitData]) => {
          const champInfo = findChampInfo(apiName);
          const itemCounts = unitData.items.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {});
          const recommendedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([itemApiName]) => {
              const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemApiName.toLowerCase());
              return { name: itemInfo?.name || '', image_url: itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon}` : null };
          });
          return {
            name: champInfo?.name || 'Unknown',
            apiName: champInfo?.apiName,
            image_url: champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon}` : null,
            cost: champInfo?.cost || 0,
            recommendedItems,
          };
        });

      const totalPlacement = deckData.placements.reduce((sum, p) => sum + p, 0);
      const avgPlacement = totalPlacement / totalGames;
      const top4Rate = deckData.placements.filter(p => p <= 4).length / totalGames;
      const tierResult = calculateTierRank(avgPlacement, top4Rate);
      const carryInfo = tftData.champions.find(c => c.name === deckData.carryChampionName);

      await DeckTier.findOneAndUpdate({ deckKey: key }, {
        carryChampionName: deckData.carryChampionName,
        carryChampionImageUrl: carryInfo?.tileIcon ? `${cdnBaseUrl}${carryInfo.tileIcon}` : null,
        mainTraitName: deckData.mainTraitName,
        coreUnits,
        totalGames,
        top4Count: deckData.placements.filter(p => p <= 4).length,
        winCount: deckData.placements.filter(p => p === 1).length,
        averagePlacement: avgPlacement,
        tierRank: tierResult.rank,
        tierOrder: tierResult.order,
      }, { upsert: true });
    }
    console.log('--- [최종] 덱 티어리스트 통계 계산 및 DB 저장 완료 ---');
  } catch (error) {
    console.error('[최종] 덱 티어리스트 분석 중 에러 발생:', error.message, error.stack);
  }
};