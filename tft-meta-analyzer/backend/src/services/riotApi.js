import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  throw new Error('Riot API key not found in .env file');
}

// Riot API는 region이 아닌 'routing value' (e.g., asia, americas)를 사용합니다.
const getApiRegion = (region) => {
  if (['kr', 'jp1'].includes(region.toLowerCase())) {
    return 'asia';
  }
  // 다른 지역 추가 가능
  // if (['na1', 'br1'].includes(region.toLowerCase())) {
  //   return 'americas';
  // }
  return 'asia'; // 기본값
};

const api = axios.create({
  headers: {
    'X-Riot-Token': RIOT_API_KEY,
  },
});

export const getAccountByRiotId = async (gameName, tagLine) => {
  const apiRegion = 'asia'; // Account API는 아시아 라우팅 값 고정
  const url = `https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
  const response = await api.get(url);
  return response.data;
};

export const getMatchIdsByPUUID = async (puuid, count = 10) => {
  const apiRegion = 'asia'; // Match API는 아시아 라우팅 값 고정
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
  const response = await api.get(url);
  return response.data;
};

export const getMatchDetail = async (matchId) => {
  const apiRegion = 'asia'; // Match API는 아시아 라우팅 값 고정
  const url = `https://${apiRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  const response = await api.get(url);
  return response.data;
};
// 이 함수를 파일 맨 아래에 추가하세요.
export const getChallengerLeague = async () => {
  const apiRegion = 'kr'; // 챌린저 목록은 특정 지역(kr)을 기준으로 가져옵니다.
  const url = `https://${apiRegion}.api.riotgames.com/tft/league/v1/challenger`;
  const response = await api.get(url);
  return response.data;
};