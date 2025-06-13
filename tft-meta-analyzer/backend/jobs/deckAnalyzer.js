import Match from '../src/models/Match.js';
import DeckTier from '../src/models/DeckTier.js';
import getTFTData from '../src/services/tftData.js';

// 이름에서 시즌 넘버 등을 제거하는 헬퍼 함수
const cleanTFTName = (name) => name ? name.replace(/^TFT\d*_/i, '') : 'Unknown';

// 통계를 바탕으로 티어를 결정하는 함수
const calculateTierRank = (averagePlacement, top4Rate) => {
    if (averagePlacement <= 4.15 && top4Rate >= 0.58) return { rank: 'S', order: 1 };
    if (averagePlacement <= 4.35 && top4Rate >= 0.53) return { rank: 'A', order: 2 };
    if (averagePlacement <= 4.55 && top4Rate >= 0.50) return { rank: 'B', order: 3 };
    if (averagePlacement <= 4.75 && top4Rate >= 0.45) return { rank: 'C', order: 4 };
    return { rank: 'D', order: 5 };
};

export const analyzeAndCacheDeckTiers = async () => {
  console.log('--- [최종] 덱 티어리스트 분석 작업 시작 ---');
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      console.error('TFT 데이터를 불러오지 못해 덱 분석을 중단합니다.');
      return;
    }

    const allMatches = await Match.find({});
    const deckDataAggregator = {};

    console.log(`총 ${allMatches.length}개의 매치를 분석합니다.`);

    // 1. 모든 매치 데이터를 순회하며 정보 누적
    allMatches.forEach(match => {
      if (!match?.info?.participants) return;

      match.info.participants.forEach(p => {
        if (!p || !Array.isArray(p.units) || !Array.isArray(p.traits)) return;
        
        const findChampInfo = (charId) => tftData.champions.find(c => c.apiName.toLowerCase() === charId.toLowerCase());
        
        const enrichedUnits = p.units.map(unit => ({ ...unit, cost: findChampInfo(unit.character_id)?.cost || 0 }));

        let carryUnit = enrichedUnits.find(u => u.tier === 3 && u.itemNames?.length >= 2) || 
                        enrichedUnits.find(u => ((u.cost === 4 || u.cost === 5) && u.tier >= 2 && u.itemNames?.length >= 2)) ||
                        [...enrichedUnits].sort((a, b) => (b.itemNames?.length || 0) - (a.itemNames?.length || 0))[0];

        if (!carryUnit || !carryUnit.character_id) return;
        
        const carryInfo = findChampInfo(carryUnit.character_id);
        if (!carryInfo) return;

        // ⬇️⬇️⬇️ 데이터 드래곤 규칙을 따르는 새로운 특성 처리 로직 ⬇️⬇️⬇️
        const traits = p.traits.map(t => {
            const traitInfo = tftData.traits.find(dt => dt.apiName.toLowerCase() === t.name.toLowerCase());
            if (!traitInfo || !traitInfo.sets) return null;

            let currentStyleName = 'default';
            let styleOrder = 0;
            const styleOrderMap = { 'bronze': 1, 'silver': 2, 'gold': 3, 'chromatic': 4, 'prismatic': 5 };

            for (const set of traitInfo.sets) {
                if (t.num_units >= set.min) {
                    currentStyleName = set.style.toLowerCase();
                    styleOrder = styleOrderMap[currentStyleName] || 0;
                }
            }
            
            return {
                name: traitInfo.name,
                tier_current: t.num_units,
                style: currentStyleName,
                styleOrder: styleOrder,
            };
        }).filter(t => t && t.styleOrder > 0);
        
        if (traits.length < 1) return;
        
        const mainTrait = [...traits].sort((a, b) => b.styleOrder - a.styleOrder)[0];
        const deckKey = `${mainTrait.name} ${carryInfo.name}`;

        if (!deckDataAggregator[deckKey]) {
          deckDataAggregator[deckKey] = {
            mainTraitName: mainTrait.name,
            carryChampionName: carryInfo.name,
            placements: [],
            unitOccurrences: {},
          };
        }

        const deckAggData = deckDataAggregator[deckKey];
        deckAggData.placements.push(p.placement);
        enrichedUnits.forEach(unit => {
          const unitId = unit.character_id;
          if (!deckAggData.unitOccurrences[unitId]) {
            deckAggData.unitOccurrences[unitId] = { count: 0, items: [], cost: unit.cost };
          }
          deckAggData.unitOccurrences[unitId].count++;
          if (Array.isArray(unit.itemNames)) {
            deckAggData.unitOccurrences[unitId].items.push(...unit.itemNames);
          }
        });
      });
    });
    
    console.log(`[최종] 분석 완료. 총 ${Object.keys(deckDataAggregator).length}개의 고유한 덱 조합 발견.`);

    // 2. 누적된 데이터로 최종 통계 계산 및 DB 저장
    for (const key in deckDataAggregator) {
      const deckData = deckDataAggregator[key];
      const totalGames = deckData.placements.length;
      if (totalGames < 3) continue;

      const cdnBaseUrl = 'https://raw.communitydragon.org/latest/game/';
      const coreUnits = Object.entries(deckData.unitOccurrences).sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([apiName, unitData]) => {
          const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === apiName.toLowerCase());
          const itemCounts = unitData.items.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {});
          const recommendedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([itemApiName]) => {
              const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemApiName.toLowerCase());
              return { name: itemInfo?.name || '', image_url: itemInfo?.icon ? `${cdnBaseUrl}${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null };
          });
          return {
            name: champInfo?.name || 'Unknown',
            apiName: champInfo?.apiName,
            image_url: champInfo?.tileIcon ? `${cdnBaseUrl}${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null,
            cost: unitData.cost, // 보강된 코스트 정보 사용
            recommendedItems,
          };
        });

      const totalPlacement = deckData.placements.reduce((sum, p) => sum + p, 0);
      const avgPlacement = totalPlacement / totalGames;
      const top4Rate = deckData.placements.filter(p => p <= 4).length / totalGames;
      const tierResult = calculateTierRank(avgPlacement, top4Rate);
      
      await DeckTier.findOneAndUpdate({ deckKey: key }, {
        mainTraitName: deckData.mainTraitName,
        carryChampionName: deckData.carryChampionName,
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