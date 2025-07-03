import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const getPlatformRegion = (regionalRegion) => {
  switch (regionalRegion.toLowerCase()) {
    case 'kr':
    case 'jp':
      return 'asia';
    case 'na':
    case 'br':
    case 'la1':
    case 'la2':
      return 'americas';
    case 'euw':
    case 'eune':
    case 'tr':
    case 'ru':
      return 'europe';
    default:
      return 'asia'; // Default or throw error
  }
};

const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  throw new Error('Riot API key not found in .env file');
}

const api = axios.create({
  headers: {
    'X-Riot-Token': RIOT_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

export const getAccountByRiotId = async (gameName, tagLine, region = 'kr') => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const response = await api.get(url);
  return response.data;
};

// 이 함수 전체를 새로운 내용으로 교체해주세요.
export const getMatchIdsByPUUID = async (puuid, count = 10, region) => {
  const apiRegion = getPlatformRegion(region);
  const queueId = 1100; // TFT 랭크 게임의 고유 ID

  // ⬇️⬇️⬇️ 실시간 유저 검색에서는 startTime 필터를 제거합니다. ⬇️⬇️⬇️
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=${queueId}`;
  
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`> 정보: ${puuid.substring(0,8)}... 님은 최근 랭크 게임 기록이 없습니다. 건너뜁니다.`);
      return [];
    }
    throw error;
  }
};

export const getMatchDetail = async (matchId, region) => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  
  const response = await api.get(url);
  return response.data;
};

export const getChallengerLeague = async (region = 'kr') => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/challenger`;
  
  const response = await api.get(url);
  return response.data;
};

export const getGrandmasterLeague = async (region = 'kr') => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/grandmaster`;
  
  const response = await api.get(url);
  return response.data;
};

export const getMasterLeague = async (region = 'kr') => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/master`;
  
  const response = await api.get(url);
  return response.data;
};



export const getAccountByPuuid = async (puuid, region) => {
  const apiRegion = getPlatformRegion(region);
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
  
  const response = await api.get(url);
  return response.data;
};

export const getSummonerByPuuid = async (puuid, region) => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;
  const response = await api.get(url);
  return response.data;
};

export const getLeagueEntriesByPuuid = async (puuid, region) => {
  const apiRegion = region;
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/by-puuid/${puuid}`;
  try {
    const response = await api.get(url);
    // Riot API 응답이 배열 형태일 것으로 예상
    if (!Array.isArray(response.data)) {
      console.warn(`WARN: getLeagueEntriesByPuuid expected array, but received:`, response.data);
      return null;
    }
    // TFT 랭크 게임 엔트리만 필터링
    return response.data.find(entry => entry.queueType === 'RANKED_TFT');
  } catch (error) {
    if (error.response) {
      console.error(`[Riot API Error] getLeagueEntriesByPuuid Status: ${error.response.status}, Data:`, error.response.data);
      if (error.response.status === 404) {
        return null;
      }
    } else {
      console.error(`[Riot API Error] getLeagueEntriesByPuuid Network Error:`, error.message);
    }
    throw error;
  }
};