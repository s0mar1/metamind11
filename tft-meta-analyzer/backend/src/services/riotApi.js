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

export const getAccountByRiotId = async (gameName, tagLine) => {
  const apiRegion = 'asia';
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
  const response = await api.get(url);
  return response.data;
};

export const getMatchIdsByPUUID = async (puuid, count = 20) => {
  const apiRegion = 'asia';
  const queueId = 1100; // TFT Ranked Queue ID
  // 14시즌 시작일 이후의 매치만 가져오도록 startTime 필터 추가
  const set14StartDate = new Date('2025-05-20T00:00:00Z'); // 실제 시즌 시작일로 조정 필요
  const startTime = Math.floor(set14StartDate.getTime() / 1000);

  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?startTime=${startTime}&count=${count}&queue=${queueId}`;
  
  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return []; // 기록이 없는 경우 빈 배열 반환
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