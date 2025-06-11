import { 
  getChallengerLeague, 
  getSummonerBySummonerId, 
  getAccountByPuuid, 
  getMatchIdsByPUUID, 
  getMatchDetail 
} from '../src/services/riotApi.js';
import Match from '../src/models/Match.js';
import Ranker from '../src/models/Ranker.js';
import getTFTData from '../src/services/tftData.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export const collectMatches = async () => {
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      console.error('TFT 데이터를 불러오지 못해 랭커 데이터 수집을 중단합니다.');
      return;
    }
    const currentSet = tftData.currentSet;
    console.log(`--- [v4 최종] 랭커 상세 정보 수집 작업 시작 (시즌 ${currentSet} 대상) ---`);

    const challengerLeague = await getChallengerLeague();
    
    const topRankers = challengerLeague.entries.slice(0, 50);
    console.log(`[수집] 챌린저 ${topRankers.length}명의 랭킹 및 상세 정보 업데이트를 시작합니다.`);

    for (const entry of topRankers) {
      try {
        const summonerData = await getSummonerBySummonerId(entry.summonerId);
        const accountData = await getAccountByPuuid(summonerData.puuid);
        
        await Ranker.findOneAndUpdate(
            { puuid: summonerData.puuid },
            {
                summonerId: entry.summonerId,
                summonerName: summonerData.name, // ⬅️ summonerData에서 실제 이름 사용
                gameName: accountData.gameName,
                tagLine: accountData.tagLine,
                profileIconId: summonerData.profileIconId,
                leaguePoints: entry.leaguePoints,
                rank: entry.rank,
                wins: entry.wins,
                losses: entry.losses,
            },
            { upsert: true, new: true }
        );
        console.log(`> 성공: [${summonerData.name}] 님의 정보 저장/업데이트 완료`);
        await delay(1200);

      } catch (e) {
        const idForLog = entry.summonerId || 'Unknown';
        console.error(`> 경고: 랭커 ID ${idForLog.substring(0,10)}... 처리 중 개별 에러: ${e.message}`);
        await delay(1200);
      }
    }
    console.log(`--- [v4 최종] 랭커 상세 정보 수집 작업 완료 ---`);

  } catch (error) {
    console.error('🚨 랭커 데이터 수집 중 치명적인 에러 발생:', error);
  }
};