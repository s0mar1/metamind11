// backend/jobs/deckAnalyzer.js
import Match from '../src/models/Match.js';
import DeckTier from '../src/models/DeckTier.js';
import getTFTData from '../src/services/tftData.js';

const calculateTierRank = (averagePlacement, top4Rate) => {
    if (averagePlacement <= 4.15 && top4Rate >= 0.58) return { rank: 'S', order: 1 };
    if (averagePlacement <= 4.35 && top4Rate >= 0.53) return { rank: 'A', order: 2 };
    if (averagePlacement <= 4.55 && top4Rate >= 0.50) return { rank: 'B', order: 3 };
    if (averagePlacement <= 4.75 && top4Rate >= 0.45) return { rank: 'C', order: 4 };
    return { rank: 'D', order: 5 };
};

export const analyzeAndCacheDeckTiers = async (tftData) => {
  if (!tftData) { console.error('TFT 데이터가 없어 덱 분석을 중단합니다.'); return; }
  console.log('--- [디버깅] 덱 티어리스트 분석 작업 시작 ---');
  try {
    const allMatches = await Match.find({});
    console.log(`[디버깅] MongoDB에서 불러온 매치 개수: ${allMatches.length}`); 

    const deckDataAggregator = {};

    console.log(`총 ${allMatches.length}개의 매치를 분석합니다.`);

    allMatches.forEach(match => {
      if (!match?.info?.participants) return;
      match.info.participants.forEach(p => {
        // const puuidShort = p.puuid.substring(0, 8); // 디버깅용, 주석 처리

        if (!p || !Array.isArray(p.units) || !Array.isArray(p.traits)) {
            // console.log(`[분석 실패] ${puuidShort}: 기본 데이터 구조(유닛/특성)가 없습니다.`); // 주석 처리
            return;
        }
        
        const enrichedUnits = p.units.map(unit => {
            const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unit.character_id.toLowerCase());
            return { ...unit, cost: champInfo ? champInfo.cost : 0 };
        });

        let carryUnit = enrichedUnits.find(u => u.tier === 3 && u.itemNames?.length >= 2) || 
                        enrichedUnits.find(u => ((u.cost === 4 || u.cost === 5) && u.tier >= 2 && u.itemNames?.length >= 2)) ||
                        [...enrichedUnits].sort((a, b) => (b.itemNames?.length || 0) - (a.itemNames?.length || 0))[0];

        if (!carryUnit || !carryUnit.character_id) {
            return;
        }
        
        const carryInfo = tftData.champions.find(c => c.apiName.toLowerCase() === carryUnit.character_id.toLowerCase());
        if (!carryInfo) {
            return;
        }

        const coreTraits = p.traits.filter(t => t.style >= 2 && t.tier_current > 0).sort((a, b) => b.tier_current - a.tier_current);
        if (coreTraits.length < 1) {
            return;
        }
        
        const mainTraitInfo = tftData.traits.find(t => t.apiName.toLowerCase() === coreTraits[0].name.toLowerCase());
        const mainTraitName = mainTraitInfo ? mainTraitInfo.name : 'Unknown';
        const deckKey = `${mainTraitName} ${carryInfo.name}`;

        if (!deckDataAggregator[deckKey]) {
          deckDataAggregator[deckKey] = {
            mainTraitName,
            carryChampionName: carryInfo.name,
            placements: [],
            unitOccurrences: {}, // { unitApiName: { count: N, items: [itemApiName1, ...], tierCounts: {1: N, 2: M, 3: L} } }
          };
        }
        deckDataAggregator[deckKey].placements.push(p.placement);

        enrichedUnits.forEach(unit => {
          const unitId = unit.character_id;
          if (!deckDataAggregator[deckKey].unitOccurrences[unitId]) {
            deckDataAggregator[deckKey].unitOccurrences[unitId] = { count: 0, items: [], tierCounts: {} }; // tierCounts 초기화
          }
          deckDataAggregator[deckKey].unitOccurrences[unitId].count++;
          if (unit.tier) { // 유닛 티어 정보가 있다면 집계
            deckDataAggregator[deckKey].unitOccurrences[unitId].tierCounts[unit.tier] = 
              (deckDataAggregator[deckKey].unitOccurrences[unitId].tierCounts[unit.tier] || 0) + 1;
          }
          if (Array.isArray(unit.itemNames)) {
            deckDataAggregator[deckKey].unitOccurrences[unitId].items.push(...unit.itemNames);
          }
        });
      });
    });
    
    console.log(`\n[최종] 분석 완료. 총 ${Object.keys(deckDataAggregator).length}개의 고유한 덱 조합 발견.`);
    
    for (const key in deckDataAggregator) {
      const deckData = deckDataAggregator[key];
      const totalGames = deckData.placements.length;
      if (totalGames === 0) continue;

      const top4Count = deckData.placements.filter(p => p <= 4).length;
      const winCount = deckData.placements.filter(p => p === 1).length;
      const averagePlacement = totalGames > 0 ? (deckData.placements.reduce((sum, p) => sum + p, 0) / totalGames) : 0;
      
      const { rank: tierRank, order: tierOrder } = calculateTierRank(averagePlacement, top4Count / totalGames);

      const coreUnitsData = [];
      const unitApiNames = Object.keys(deckData.unitOccurrences);

      for (const unitApiName of unitApiNames) {
        const unitStats = deckData.unitOccurrences[unitApiName];
        const champInfo = tftData.champions.find(c => c.apiName.toLowerCase() === unitApiName.toLowerCase());
        
        const unitName = champInfo ? champInfo.name : unitApiName;
        const unitImageUrl = champInfo?.tileIcon ? `https://raw.communitydragon.org/latest/game/${champInfo.tileIcon.toLowerCase().replace('.tex', '.png')}` : null;
        const unitCost = champInfo ? champInfo.cost : 0;

        // 가장 많이 등장한 티어 계산
        let mostFrequentTier = 0;
        let maxTierCount = 0;
        for (const tier in unitStats.tierCounts) {
            if (unitStats.tierCounts[tier] > maxTierCount) {
                maxTierCount = unitStats.tierCounts[tier];
                mostFrequentTier = parseInt(tier, 10);
            }
        }
        
        const itemCounts = {};
        unitStats.items.forEach(itemName => {
          itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
        });

        const recommendedItems = Object.entries(itemCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 3)
          .map(([itemApiName]) => {
            const itemInfo = tftData.items.find(i => i.apiName.toLowerCase() === itemApiName.toLowerCase());
            const itemImageUrl = itemInfo?.icon ? `https://raw.communitydragon.org/latest/game/${itemInfo.icon.toLowerCase().replace('.tex', '.png')}` : null;
            return { name: itemInfo ? itemInfo.name : itemApiName, image_url: itemImageUrl };
          });
        
        coreUnitsData.push({
          name: unitName,
          apiName: unitApiName,
          image_url: unitImageUrl,
          cost: unitCost,
          tier: mostFrequentTier, // 🚨 가장 많이 등장한 티어 할당
          count: unitStats.count, 
          recommendedItems: recommendedItems,
        });
      }

      // 덱 그룹 내에서 가장 많이 등장한 유닛들로 정렬 (최대 8개)
      // 캐리 챔피언을 맨 앞으로 옮기는 정렬은 프론트엔드에서 하므로 여기서는 등장 횟수 순으로만 정렬
      const finalCoreUnits = coreUnitsData.sort((a, b) => b.count - a.count).slice(0, 8);

      await DeckTier.findOneAndUpdate(
        { deckKey: key },
        {
          tierRank,
          tierOrder,
          mainTraitName: deckData.mainTraitName,
          carryChampionName: deckData.carryChampionName,
          totalGames,
          top4Count,
          winCount,
          averagePlacement,
          coreUnits: finalCoreUnits,
        },
        { upsert: true, new: true }
      );
    }
    console.log('--- [최종] 덱 티어리스트 통계 계산 및 DB 저장 완료 ---');
  } catch (error) {
    console.error('[최종] 덱 티어리스트 분석 중 에러 발생:', error.message, error.stack);
  }
};