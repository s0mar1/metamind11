// backend/src/services/scheduler.js

import cron from 'node-cron';
import { getChallengerLeague, getMatchIdsByPUUID, getMatchDetail } from './riotApi.js';
import Match from '../models/Match.js';
import DeckTier from '../models/DeckTier.js';
import { loadTFTData, getCDNImageUrl } from './tftData.js'; // tftData 서비스 임포트

// ... (fetchWithRetry, delay 함수는 그대로 둡니다.) ...

// TFT 데이터 드래곤 이름 접두사 제거 헬퍼 함수 (필요한 곳에서만 사용)
const cleanTFTName = (name) => {
    if (!name) return 'Unknown';
    return name.replace(/^TFT\d*_/i, '');
};

// ... (collectRankerData 함수는 그대로 둡니다.) ...

// 덱의 티어 랭크를 계산하는 헬퍼 함수 (사용자 의견 반영: 평균 등수 기준 재조정)
const calculateTierRank = (averagePlacement, top4Count, totalGames) => {
    const top4Rate = top4Count / totalGames;

    // 사용자 의견 반영: 4.x대 평균 등수도 S티어 가능
    // 평균 등수가 낮을수록 (1등에 가까울수록) 좋음, 탑 4 확률이 높을수록 좋음

    // S 티어: 매우 강력한 덱 (평균 4.2위 이내, 탑4 확률 80% 이상)
    if (averagePlacement <= 4.2 && top4Rate >= 0.80) return 'S'; 
    // A 티어: 강력한 덱 (평균 4.3위 이내, 탑4 확률 65% 이상)
    if (averagePlacement <= 4.3 && top4Rate >= 0.65) return 'A'; 
    // B 티어: 경쟁력 있는 덱 (평균 4.5위 이내, 탑4 확률 50% 이상)
    if (averagePlacement <= 4.5 && top4Rate >= 0.50) return 'B'; 
    // C 티어: 보통 덱 (평균 4.6위 이내, 탑4 확률 35% 이상)
    if (averagePlacement <= 4.6 && top4Rate >= 0.35) return 'C'; 
    // D 티어: 평균 이하의 덱 (나머지)
    return 'D'; 
}

/**
 * DB의 Match 데이터를 분석하여 덱 티어 정보를 계산하고 저장/업데이트하는 함수
 */
const analyzeAndCacheDeckTiers = async () => {
  console.log('--- [고도화] 덱 티어리스트 분석 작업 시작 ---');
  try {
    const tftData = await loadTFTData(); // TFT 데이터 로드
    if (!tftData) {
        console.error('TFT 데이터를 불러오지 못해 덱 분석을 건너뛰었습니다.');
        return;
    }

    const allMatches = await Match.find({}); 
    console.log(`[디버깅] DB에서 불러온 총 매치 수: ${allMatches.length}`); 
    if (allMatches.length === 0) {
        console.log("[디버깅] DB에 매치 데이터가 없습니다. collectRankerData가 제대로 작동하는지 확인하세요."); 
    }
    
    const deckStats = {}; 

    allMatches.forEach(match => {
      const allParticipantsInMatch = match.info.participants; 

      allParticipantsInMatch.forEach(p => { 
        console.log(`[디버깅] 참가자 ${p?.puuid ? p.puuid.substring(0, 8) : 'Unknown'}: 등수 ${p.placement}`); 

        if (!p || !Array.isArray(p.units) || !Array.isArray(p.traits)) {
          return;
        }

        // --- 캐리 유닛 선정 로직 (챔피언의 한글 이름 가져오기) --- 
        let carryUnit = null;
        let selectedCarryChampInfo = null; 

        // 챔피언 API 이름으로 tftData에서 챔피언 정보 찾기 (정확한 매핑을 위해)
        const findChampInfo = (unit) => tftData.champions.find(c => c.apiName === unit.character_id);

        carryUnit = p.units.find(u => u.tier === 3 && u.items?.length > 0);
        if (carryUnit) selectedCarryChampInfo = findChampInfo(carryUnit);

        if (!carryUnit) {
          carryUnit = p.units.find(u => (u.cost >= 4 && u.tier >= 2 && u.items?.length >= 1));
          if (carryUnit) selectedCarryChampInfo = findChampInfo(carryUnit);
        }
        
        if (!carryUnit) {
            const sortedUnitsByItems = [...p.units].sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
            if (sortedUnitsByItems[0]) { 
                carryUnit = sortedUnitsByItems[0];
                selectedCarryChampInfo = findChampInfo(carryUnit);
            }
        }
        if (!carryUnit && p.units.length > 0) { 
            carryUnit = p.units[0];
            selectedCarryChampInfo = findChampInfo(carryUnit);
        }

        if (!carryUnit) { 
            console.log(`[디버깅] 스킵: 최종 캐리 유닛 선정 실패 (유닛 목록: ${p.units.map(u => cleanTFTName(u.character_id)).join(', ')})`); 
            return; 
        }
        // 캐리 챔피언 이름은 이제 tftData에서 가져온 한글 이름 사용
        const carryChampionDisplayName = selectedCarryChampInfo ? selectedCarryChampInfo.name : cleanTFTName(carryUnit.character_id);
        console.log(`[디버깅] 캐리 유닛 선정됨: ${carryChampionDisplayName} (아이템 ${carryUnit.items?.length || 0}개)`); 


        // --- 핵심 시너지 선정 로직 (한글 이름 및 이미지 URL 포함) ---
        const activeTraits = p.traits
          .filter(t => t.style >= 1 && t.tier_current > 0) 
          .map(t => {
            const traitInfo = tftData.traits.find(dt => dt.apiName === t.name); // tftData에서 시너지 정보 찾기
            return { 
                name: traitInfo ? traitInfo.name : cleanTFTName(t.name), // ⬅️ 한글 이름 사용
                tier_current: t.tier_current, 
                num_units: t.num_units,
                image_url: traitInfo ? getCDNImageUrl(traitInfo.icon) : null, // ⬅️ 이미지 URL 추가
            }; 
          }) 
          .sort((a, b) => {
            if (b.tier_current !== a.tier_current) return b.tier_current - a.tier_current;
            return b.num_units - a.num_units; 
          });

        if (activeTraits.length < 1) { 
            console.log(`[디버깅] 스킵: 활성화된 핵심 시너지 부족`); 
            return; 
        }
        const mainTrait = activeTraits[0]; 
        console.log(`[디버깅] 메인 시너지 선정됨: ${mainTrait.name}(${mainTrait.tier_current})`); 


        // --- 덱 키(deckKey) 생성 (메인 시너지의 한글 이름 사용) ---
        const deckKey = `${mainTrait.name}_${mainTrait.tier_current}`;
        console.log(`[디버깅] 덱 키 생성됨: ${deckKey}`); 

        // --- 덱 통계 초기화 및 업데이트 ---
        if (!deckStats[deckKey]) {
          deckStats[deckKey] = {
            traits: activeTraits.map(t => ({ name: t.name, tier_current: t.tier_current, image_url: t.image_url })), 
            carryChampionName: 'Unknown', 
            totalGames: 0,
            totalPlacement: 0,
            top4Count: 0,
            winCount: 0,
            carryChampionCounts: {}, 
          };
        }
        const stats = deckStats[deckKey];
        stats.totalGames += 1;
        stats.totalPlacement += p.placement;
        if (p.placement <= 4) stats.top4Count += 1; 
        if (p.placement === 1) stats.winCount += 1;

        // --- 캐리 챔피언 통계 누적 (덱 키 별로) --- 
        stats.carryChampionCounts[carryChampionDisplayName] = (stats.carryChampionCounts[carryChampionDisplayName] || 0) + 1;
        
        console.log(`[디버깅] 덱 통계 업데이트됨: ${deckKey}, 총 게임: ${stats.totalGames}, 캐리 통계 누적됨`); 
      });
    });

    console.log(`[고도화] 분석 완료. 총 ${Object.keys(deckStats).length}개의 고유한 덱 조합 발견.`);

    // 덱 티어 계산 및 DB 업데이트
    for (const key in deckStats) {
      const stats = deckStats[key];
      
      if (stats.totalGames < 1) { 
          console.log(`> 스킵: ${key} (게임 수 부족: ${stats.totalGames})`);
          continue;
      }

      let finalCarryChampionName = 'Unknown';
      let maxCount = 0;
      for (const champName in stats.carryChampionCounts) {
          if (stats.carryChampionCounts[champName] > maxCount) {
              maxCount = stats.carryChampionCounts[champName];
              finalCarryChampionName = champName;
          }
      }
      
      await DeckTier.findOneAndUpdate(
        { deckKey: key },
        {
          carryChampionName: finalCarryChampionName, 
          traits: stats.traits, 
          totalGames: stats.totalGames,
          top4Count: stats.top4Count,
          winCount: stats.winCount,
          averagePlacement: stats.totalPlacement / stats.totalGames,
          tierRank: calculateTierRank(stats.averagePlacement, stats.top4Count, stats.totalGames),
        },
        { upsert: true, new: true } 
      );
      console.log(`> 성공: 덱 티어 ${key} 를 DB에 저장/업데이트했습니다. 캐리: ${finalCarryChampionName}`);
    }
    console.log('--- [고도화] 덱 티어리스트 분석 및 저장 완료 ---\n');

  } catch (error) {
    console.error('[고도화] 덱 티어리스트 분석 중 에러 발생:', error.message);
  }
};

// ... (cron 스케줄 및 서버 시작 시 실행 로직은 그대로 둡니다.) ...

// 매일 오전 5시에 랭커 데이터 수집 실행
cron.schedule('0 5 * * *', () => {
  console.log('정해진 시간(오전 5시)이 되어 랭커 데이터 수집을 시작합니다.');
  collectRankerData();
}, {
  scheduled: true,
  timezone: "Asia/Seoul"
});

// 매시간 정각에 덱 티어리스트 분석 실행
cron.schedule('0 */1 * * *', () => { 
  console.log('정해진 시간(매시 정각)이 되어 덱 티어 분석을 시작합니다.');
  analyzeAndCacheDeckTiers();
});

// 서버가 시작될 때 테스트를 위해 즉시 1번씩 실행
console.log('서버 시작. 테스트를 위해 데이터 수집 및 분석을 1회 실행합니다.');
collectRankerData();
setTimeout(analyzeAndCacheDeckTiers, 30000);