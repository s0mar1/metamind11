// backend/jobs/matchCollector.js

import pkg from 'node-cron';
const { CronJob } = pkg;

import * as riotApi from '../src/services/riotApi.js';
import Summoner from '../src/models/Summoner.js';
import Match from '../src/models/Match.js';
import { loadTFTData } from '../src/services/tftData.js'; // 🚨 NEW: loadTFTData 임포트

export async function collectMatches() {
  try {
    console.log('--- 랭커 데이터 수집 작업 시작 ---');

    // 🚨 NEW: 현재 TFT 데이터 (currentSet 포함) 로드
    const tftData = await loadTFTData();
    if (!tftData || !tftData.currentSet) {
      console.error('TFT 데이터를 불러오지 못해 현재 세트 필터링을 건너뜁니다.');
      return;
    }
    const currentSet = tftData.currentSet; // '14'


    const challengerLeague = await riotApi.getChallengerLeague();
    console.log(`[디버깅] 챌린저 총 수: ${challengerLeague.entries.length}`);

    const collectedMatchIds = new Set();

    for (const entry of challengerLeague.entries) {
      const puuid = entry.puuid;
      const existingMatchesCount = await Match.countDocuments({ 'info.participants.puuid': puuid });
      if (existingMatchesCount > 0) {
        // console.log(`[디버깅] ${puuid.substring(0, 8)}... 기존 매치가 있어 매치 수집을 건너뜨.`);
        continue;
      }

      console.log(`[디버깅] ${puuid.substring(0, 8)}... 매치 ID 수집 시작.`);
      const matchIds = await riotApi.getMatchIdsByPUUID(puuid, 20);
      console.log(`[디버깅] ${puuid.substring(0, 8)}... 매치 ID ${matchIds.length}개 발견.`);

      for (const matchId of matchIds) {
        if (collectedMatchIds.has(matchId)) {
          // console.log(`[디버깅] 매치 ID ${matchId.substring(0, 8)}... 이미 수집됨. 건너뛰기.`);
          continue;
        }

        const existingMatchInDb = await Match.findOne({ 'metadata.match_id': matchId });
        if (existingMatchInDb) {
          // console.log(`[디버깅] 매치 ID ${matchId.substring(0, 8)}... DB에 이미 존재. 건너뛰기.`);
          collectedMatchIds.add(matchId);
          continue;
        }

        try {
          console.log(`[디버깅] 매치 ID ${matchId.substring(0, 8)}... 상세 정보 요청 시작.`);
          const matchDetail = await riotApi.getMatchDetail(matchId);

          // 🚨 NEW: 현재 세트 매치 필터링 로직
          const matchDataVersionPrefix = matchDetail.metadata.data_version.split('.')[0]; // '14.16.1' -> '14'
          if (matchDataVersionPrefix !== currentSet) {
            console.log(`❕ 매치 ${matchId.substring(0, 8)}... (세트 불일치: ${matchDataVersionPrefix} vs ${currentSet}). 저장하지 않습니다.`);
            continue; // 현재 세트가 아닌 매치는 건너뜀
          }

          // 게임이 정상적으로 'finished' 상태로 종료되었는지 확인 (placement가 1~8 사이인지)
          const allPlacementsValid = matchDetail.info.participants.every(p => p.placement >= 1 && p.placement <= 8);

          if (allPlacementsValid) {
            await Match.create({
              'metadata.match_id': matchDetail.metadata.match_id,
              metadata: matchDetail.metadata,
              info: matchDetail.info
            });
            console.log(`✅ 매치 ${matchId.substring(0, 8)}... DB에 성공적으로 저장됨. (세트 ${matchDataVersionPrefix}, 게임 시간: ${new Date(matchDetail.info.game_datetime).toLocaleString()})`);
            collectedMatchIds.add(matchId);
          } else {
            console.log(`❌ 매치 ${matchId.substring(0, 8)}... 불완전한 게임 데이터. 저장하지 않습니다.`);
          }
          await delay(120);
        } catch (apiError) {
          if (apiError.response && apiError.response.status === 429) {
            console.warn(`⚠️ 라이엇 API 요청 제한 초과! 1분 대기 후 재시도...`);
            await delay(60000);
          } else if (apiError.response && apiError.response.status === 404) {
            console.warn(`❗ 매치 ${matchId.substring(0,8)}... 데이터를 찾을 수 없습니다 (404). 스킵합니다.`);
          } else {
            console.error(`🚨 매치 ${matchId.substring(0, 8)}... 상세 정보 가져오는 중 에러 발생:`, apiError.message);
          }
        }
      }
    }
    console.log('--- 랭커 데이터 수집 완료 ---');
  } catch (error) {
    console.error('🚨 랭커 데이터 수집 중 치명적인 에러 발생:', error);
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// 이 부분은 scheduler.js에서 스케줄링하므로 그대로 둡니다.
// new CronJob('0 */30 * * * *', collectMatches, null, true, 'Asia/Seoul');