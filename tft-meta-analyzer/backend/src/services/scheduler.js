import cron from 'node-cron';
import { collectMatches } from '../../jobs/matchCollector.js';
import { analyzeAndCacheDeckTiers } from '../../jobs/deckAnalyzer.js';
import { analyzePlayerStats } from '../../jobs/playerStatsAnalyzer.js'; // ⬅️ 새로 추가된 분석기 import
import getTFTData from './tftData.js';

/**
 * 모든 스케줄링된 작업을 관리하고 실행하는 메인 함수
 */
const runScheduledJobs = async () => {
  console.log('스케줄러 시작. 먼저 TFT 데이터를 로드합니다...');
  const tftData = await getTFTData();

  if (!tftData) {
    console.error('TFT 데이터 로딩에 실패하여 스케줄링된 작업을 실행할 수 없습니다.');
    return;
  }
  
  console.log('TFT 데이터 준비 완료. 예약된 작업을 설정합니다.');

  // 1. 랭커 및 매치 데이터 수집 작업 (매일 오전 5시)
  cron.schedule('0 5 * * *', () => {
    console.log('정기 랭커 데이터 수집을 시작합니다.');
    collectMatches(tftData);
  }, { scheduled: true, timezone: "Asia/Seoul" });

  // 2. 덱 티어 분석 작업 (1시간마다 정각)
  cron.schedule('0 */1 * * *', () => { 
    console.log('정기 덱 티어 분석을 시작합니다.');
    analyzeAndCacheDeckTiers(tftData);
  }, { scheduled: true, timezone: "Asia/Seoul" });
  
  // 3. 랭커별 1등 승률 분석 작업 (2시간마다 5분)
  cron.schedule('5 */2 * * *', () => {
    console.log('정기 랭커 통계 분석을 시작합니다.');
    analyzePlayerStats();
  }, { scheduled: true, timezone: "Asia/Seoul" });

  // 서버가 시작될 때 모든 작업을 순차적으로 1회 실행 (테스트용)
  console.log('서버 시작. 1회성 데이터 수집 및 분석을 순차적으로 실행합니다.');
  try {
    await collectMatches(tftData);
    await analyzeAndCacheDeckTiers(tftData);
    await analyzePlayerStats();
    console.log('초기 데이터 작업이 모두 완료되었습니다.');
  } catch (error) {
    console.error('초기 작업 실행 중 에러 발생:', error);
  }
};

// 스케줄러 실행
runScheduledJobs();