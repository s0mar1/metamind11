// backend/jobs/matchCollector.js
import { getChallengerLeague, getSummonerByPuuid, getAccountByPuuid, getMatchIdsByPUUID, getMatchDetail } from '../src/services/riotApi.js';
import Match from '../src/models/Match.js';
import Ranker from '../src/models/Ranker.js';
import getTFTData from '../src/services/tftData.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export const collectTopRankerMatches = async () => {
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      console.error('TFT 데이터를 불러오지 못해 랭커 데이터 수집을 중단합니다.');
      return;
    }
    const currentSet = tftData.currentSet;
    console.log(`--- [최종] 랭커 및 매치 데이터 수집 작업 시작 (시즌 ${currentSet} 대상) ---`);

    // 1단계: 랭커 목록 확보
    const challengerLeague = await getChallengerLeague('kr');
    const topRankers = challengerLeague.entries.slice(0, 10);
    console.log(`[1단계 완료] 챌린저 ${topRankers.length}명의 랭커 데이터 확보.`);
    console.log("DEBUG: Full data for first 3 topRankers entries:");
    topRankers.slice(0, 3).forEach((entry, index) => {
      console.log(`  Entry ${index}:`, JSON.stringify(entry, null, 2));
    });

    // 2단계: 랭커 프로필 업데이트
    console.log(`[2단계 시작] 챌린저 ${topRankers.length}명의 프로필 업데이트 시작...`);
    for (const entry of topRankers) {
      try {
        // console.log(`[2단계 - 처리 중] 랭커 ID: ${entry.summonerId.substring(0,10)}... (PUUID: ${entry.puuid.substring(0,10)}...)`); // 상세 로그 제거
        
        const summonerDetails = await getSummonerByPuuid(entry.puuid, 'kr');
        await delay(1200); // API 호출 후 딜레이

        const accountData = await getAccountByPuuid(summonerDetails.puuid, 'kr'); // puuid는 summonerDetails에서 가져옴
        await delay(1200); // API 호출 후 딜레이
        
        await Ranker.findOneAndUpdate(
            { puuid: summonerDetails.puuid },
            {
                summonerId: summonerDetails.id,
                summonerName: summonerDetails.name,
                gameName: accountData.gameName,
                tagLine: accountData.tagLine,
                profileIconId: summonerDetails.profileIconId,
                leaguePoints: entry.leaguePoints,
                rank: entry.rank,
                wins: entry.wins,
                losses: entry.losses,
            },
            { upsert: true }
        );
        console.log(`[2단계 - 완료] ${summonerDetails.name}#${accountData.tagLine} 프로필 업데이트 완료.`);
      } catch (e) {
        console.error(`[2단계 - 에러] 랭커 ID: ${entry.summonerId.substring(0,10)}... 프로필 처리 중 에러: ${e.message}`);
      }
    }
    console.log('[2단계 완료] 모든 랭커 프로필 업데이트 완료.');

    // 3단계: 매치 ID 수집
    console.log('[3단계 시작] 매치 ID 수집 시작...');
    const rankersFromDB = await Ranker.find({}).limit(10).sort({ leaguePoints: -1 });
    let allMatchIds = [];
    for (const ranker of rankersFromDB) {
      if (!ranker.puuid) continue;
      // console.log(`[3단계 - 매치 ID 수집] 랭커 ${ranker.summonerName}의 매치 ID 가져오는 중...`); // 상세 로그 제거
      const matchIds = await getMatchIdsByPUUID(ranker.puuid, 5, 'kr'); // 최근 5개 매치 ID
      allMatchIds.push(...matchIds);
      await delay(1200); // API 호출 후 딜레이
    }
    
    const uniqueMatchIds = [...new Set(allMatchIds)];
    console.log(`[3단계 완료] 총 ${uniqueMatchIds.length}개의 고유 매치 ID 확보.`);

    // 4단계: 매치 상세 정보 저장
    console.log('[4단계 시작] 매치 상세 정보 저장 시작...');
    const limitedMatchIds = uniqueMatchIds.slice(0, 50); // 최대 50개 매치만 처리
    console.log(`[4단계 - 처리 대상] 총 ${limitedMatchIds.length}개의 매치 상세 정보 조회를 시작합니다.`);

    for (const matchId of limitedMatchIds) {
      try {
        const existingMatch = await Match.findOne({ 'metadata.match_id': matchId });
        if (existingMatch) {
          // console.log(`[4단계 - 매치 상세] 🟡 매치 ${matchId.substring(0, 8)}... 이미 DB에 존재하여 건너뜀.`); // 상세 로그 제거
          continue;
        }

        // console.log(`[4단계 - 매치 상세] 매치 ${matchId.substring(0, 8)}... 상세 정보 가져오는 중...`); // 상세 로그 제거
        const matchDetail = await getMatchDetail(matchId, 'kr');
        await delay(1200); // API 호출 후 딜레이
        
        const matchDataVersion = matchDetail?.metadata?.data_version;
        if (!matchDataVersion || !matchDetail?.info?.game_length || matchDetail.info.game_length < 1) {
          // console.log(`[4단계 - 매치 상세] 🟠 매치 ${matchId.substring(0, 8)}... 유효하지 않은 데이터 (버전, 길이 등)로 건너뜀.`); // 상세 로그 제거
          continue;
        }

        await Match.create(matchDetail);
        console.log(`[4단계 - 매치 상세] ✅ 매치 ${matchId.substring(0, 8)}... DB에 성공적으로 저장됨.`);
      } catch (detailError) {
        if (detailError.isAxiosError && detailError.response) {
            if (detailError.response.status === 404) {
                console.warn(`[4단계 - 매치 상세] ⚠️ 매치 ${matchId.substring(0, 8)}... Riot API에서 찾을 수 없음 (404).`);
            } else if (detailError.response.status === 429) {
                console.error(`[4단계 - 매치 상세] 🔴 매치 ${matchId.substring(0, 8)}... Riot API Rate Limit 초과 (429). 잠시 후 재시도 필요.`);
            } else {
                console.error(`[4단계 - 매치 상세] 🚨 매치 ${matchId.substring(0, 8)}... Riot API 에러 (${detailError.response.status}):`, detailError.message, detailError.response.data);
            }
        } else {
            console.error(`[4단계 - 매치 상세] ❌ 매치 ${matchId.substring(0, 8)}... 처리 중 예상치 못한 에러:`, detailError.message, detailError.stack);
        }
        await delay(1200); // 에러 발생 시에도 딜레이
      }
    }
    console.log('[4단계 완료] 모든 매치 데이터 수집 완료.');

  } catch (error) {
    console.error('🚨 데이터 수집 작업 중 치명적인 에러 발생:', error);
  }
};