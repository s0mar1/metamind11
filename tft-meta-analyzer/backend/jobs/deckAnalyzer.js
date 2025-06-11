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
    const deckDataAggregator = {};

    console.log(`총 ${allMatches.length}개의 매치를 분석합니다.`);

    allMatches.forEach(match => {
      if (!match?.info?.participants) return;
      match.info.participants.forEach(p => {
        const puuidShort = p.puuid.substring(0, 8);
        console.log(`\n[분석 시작] 플레이어: ${puuidShort}, 등수: ${p.placement}`);

        if (!p || !Array.isArray(p.units) || !Array.isArray(p.traits)) {
            console.log(`[분석 실패] ${puuidShort}: 기본 데이터 구조(유닛/특성)가 없습니다.`);
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
            console.log(`[분석 실패] ${puuidShort}: 캐리 유닛을 찾지 못했습니다.`);
            return;
        }
        
        const carryInfo = tftData.champions.find(c => c.apiName.toLowerCase() === carryUnit.character_id.toLowerCase());
        if (!carryInfo) {
            console.log(`[분석 실패] ${puuidShort}: 캐리 유닛(${carryUnit.character_id})의 정보를 찾지 못했습니다.`);
            return;
        }

        const coreTraits = p.traits.filter(t => t.style >= 2 && t.tier_current > 0).sort((a, b) => b.tier_current - a.tier_current);
        if (coreTraits.length < 1) {
            console.log(`[분석 실패] ${puuidShort}: 유효한 핵심 특성(실버 이상)이 없습니다.`);
            return;
        }
        
        console.log(`[분석 통과] ${puuidShort}: 캐리(${carryInfo.name}) 및 특성 식별 완료. 데이터 집계를 시작합니다.`);
        // 이하 데이터 집계 로직 (이전과 동일)
        const mainTraitInfo = tftData.traits.find(t => t.apiName.toLowerCase() === coreTraits[0].name.toLowerCase());
        const mainTraitName = mainTraitInfo ? mainTraitInfo.name : 'Unknown';
        const deckKey = `${mainTraitName} ${carryInfo.name}`;
        if (!deckDataAggregator[deckKey]) {
          deckDataAggregator[deckKey] = { mainTraitName, carryChampionName: carryInfo.name, placements: [], unitOccurrences: {}, };
        }
        deckDataAggregator[deckKey].placements.push(p.placement);
        enrichedUnits.forEach(unit => {
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
    
    console.log(`\n[최종] 분석 완료. 총 ${Object.keys(deckDataAggregator).length}개의 고유한 덱 조합 발견.`);
    // ... 이하 DB 저장 로직은 이전과 동일
    for (const key in deckDataAggregator) {
        // ...
    }
    console.log('--- [최종] 덱 티어리스트 통계 계산 및 DB 저장 완료 ---');
  } catch (error) {
    console.error('[최종] 덱 티어리스트 분석 중 에러 발생:', error.message, error.stack);
  }
};