import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  throw new Error('Riot API key not found in .env file');
}

const api = axios.create({
  headers: {
    'X-Riot-Token': RIOT_API_KEY,
  },
});

// 이 함수는 현재 matchIdsByPUUID에서 직접 사용되지 않으므로, 유지하거나 필요시 제거 가능
export const getTFTCurrentDataVersion = async () => {
    try {
        const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = response.data;
        return null;
    } catch (error) {
        console.error("Failed to fetch TFT data version:", error.message);
        return null;
    }
}

export const getAccountByRiotId = async (gameName, tagLine) => {
  const apiRegion = 'asia';
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
  const response = await api.get(url);
  return response.data;
};

export const getMatchIdsByPUUID = async (puuid, count = 20) => {
  const apiRegion = 'asia';
  const queueId = 1100; // TFT 랭크 게임
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${count}&queue=${queueId}`;
  
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    throw error;
  }
};

export const getMatchDetail = async (matchId) => {
  const apiRegion = 'asia';
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  const response = await api.get(url);
  return response.data;
};

export const getChallengerLeague = async () => {
  const apiRegion = 'kr';
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/challenger`;
  const response = await api.get(url);
  return response.data;
};

export const getSummonerBySummonerId = async (summonerId) => {
  const apiRegion = 'kr';
  const url = `https://${apiRegion}.api.riotgames.com/tft/summoner/v1/summoners/${summonerId}`;
  const response = await api.get(url);
  return response.data;
};

export const getAccountByPuuid = async (puuid) => {
  const apiRegion = 'asia';
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
  const response = await api.get(url);
  return response.data;
};

export const getSummonerByPuuid = async (puuid) => {
  const apiRegion = 'kr';
  const url = `https://${apiRegion}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;
  const response = await api.get(url);
  return response.data;
};

// **tft/league/v1으로 변경** - 최신 정보 및 curl 테스트 결과 기반
export const getLeagueEntriesBySummonerId = async (summonerId) => {
  const apiRegion = 'kr';
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerId}`; 
  try {
    const response = await api.get(url);
    return response.data.find(entry => entry.queueType === 'RANKED_TFT');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(`[WARNING] LeagueEntries 404 for summonerId: ${summonerId} (V1)`);
      return null; 
    }
    // 403 에러의 경우, 더 자세한 정보를 로그에 남깁니다.
    if (error.response && error.response.status === 403) {
        console.error(`Riot API 403 에러 (LeagueEntries V1): URL: ${url}, Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        console.error(`[ERROR] Problematic summonerId: ${summonerId}`);
    } else {
        console.error(`Riot API 에러 (LeagueEntries V1 - 기타 오류): URL: ${url}, Status: ${error.response?.status}, Message: ${error.message}`);
    }
    throw error;
  }
};