import { getChallengerLeague, getSummonerBySummonerId, getAccountByPuuid, getMatchIdsByPUUID, getMatchDetail } from '../src/services/riotApi.js';
import Match from '../src/models/Match.js';
import Ranker from '../src/models/Ranker.js';
import getTFTData from '../src/services/tftData.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

// ⬇️⬇️⬇️ 함수 이름을 여기서 변경합니다. ⬇️⬇️⬇️
export const collectTopRankerMatches = async () => {
  try {
    const tftData = await getTFTData();
    if (!tftData) {
      console.error('TFT 데이터를 불러오지 못해 랭커 데이터 수집을 중단합니다.');
      return;
    }
    const currentSet = tftData.currentSet;
    console.log(`--- [최종] 랭커 및 매치 데이터 수집 작업 시작 (시즌 ${currentSet} 대상) ---`);

    const challengerLeague = await getChallengerLeague();
    const topRankers = challengerLeague.entries.slice(0, 10);
    
    console.log(`[수집 1/2] 챌린저 ${topRankers.length}명의 프로필 업데이트 시작...`);
    for (const entry of topRankers) {
      try {
        const summonerData = await getSummonerBySummonerId(entry.summonerId);
        const accountData = await getAccountByPuuid(summonerData.puuid);
        
        await Ranker.findOneAndUpdate(
            { puuid: summonerData.puuid },
            {
                summonerId: entry.summonerId,
                summonerName: summonerData.name,
                gameName: accountData.gameName,
                tagLine: accountData.tagLine,
                profileIconId: summonerData.profileIconId,
                leaguePoints: entry.leaguePoints,
                rank: entry.rank,
                wins: entry.wins,
                losses: entry.losses,
            },
            { upsert: true }
        );
        await delay(1200);
      } catch (e) {
        console.error(`> 경고: ${entry.summonerId.substring(0,10)}... 프로필 처리 중 에러: ${e.message}`);
        await delay(1200);
      }
    }
    console.log('--- 랭커 프로필 수집 완료 ---');

    console.log('--- 매치 데이터 수집 시작 ---');
    const rankersFromDB = await Ranker.find({}).limit(10).sort({ leaguePoints: -1 });
    let allMatchIds = [];
    for (const ranker of rankersFromDB) {
      if (!ranker.puuid) continue;
      const matchIds = await getMatchIdsByPUUID(ranker.puuid, 10);
      allMatchIds.push(...matchIds);
      await delay(200);
    }
    
    const uniqueMatchIds = [...new Set(allMatchIds)];
    const limitedMatchIds = uniqueMatchIds.slice(0, 50);
    console.log(`[수집 2/2] ${limitedMatchIds.length}개의 매치 상세 정보 조회를 시작합니다.`);

    for (const matchId of limitedMatchIds) {
      const existingMatch = await Match.findOne({ 'metadata.match_id': matchId });
      if (existingMatch) continue;

      try {
        const matchDetail = await getMatchDetail(matchId);
        if (!matchDetail?.metadata?.data_version || !matchDetail?.info?.game_length || matchDetail.info.game_length < 1) continue;
        
        const matchDataVersionPrefix = matchDetail.metadata.data_version.split('.')[0];
        if (matchDataVersionPrefix !== currentSet) continue;

        await Match.create(matchDetail);
        console.log(`✅ 매치 ${matchId.substring(0, 8)}... DB에 성공적으로 저장됨.`);
        await delay(1200);
      } catch (detailError) {
        if (detailError.response?.status !== 404) {
          console.error(`🚨 매치 ${matchId.substring(0, 8)}... 처리 중 에러:`, detailError.message);
        }
      }
    }
    console.log('--- 매치 데이터 수집 완료 ---');

  } catch (error) {
    console.error('🚨 데이터 수집 작업 중 치명적인 에러 발생:', error);
  }
};