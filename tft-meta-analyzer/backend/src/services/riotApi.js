import axios from "axios";

const API_KEY = process.env.RIOT_API_KEY;

export const PLATFORM_HOSTS = {
  kr:  "asia.api.riotgames.com",
  na:  "americas.api.riotgames.com",
  euw: "europe.api.riotgames.com",
  eun: "europe.api.riotgames.com",
  jp:  "asia.api.riotgames.com",
  br:  "americas.api.riotgames.com",
  lan: "americas.api.riotgames.com",
  las: "americas.api.riotgames.com",
  oce: "sea.api.riotgames.com",
  tr:  "europe.api.riotgames.com",
  ru:  "europe.api.riotgames.com",
};

// 1) Riot 계정 조회 (by-riot-id)
export async function getAccountByRiotId(region, name, tag) {
  const host = PLATFORM_HOSTS[region] || PLATFORM_HOSTS.kr;
  const url  = `https://${host}/riot/account/v1/accounts/by-riot-id/` +
               `${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const res  = await axios.get(url, {
    headers: { "X-Riot-Token": API_KEY }
  });
  return res.data;
}

// 2) 최근 매치 ID 목록
export async function getMatchIds(region, puuid, count = 5) {
  const host = PLATFORM_HOSTS[region] || PLATFORM_HOSTS.kr;
  const url  = `https://${host}/tft/match/v1/matches/by-puuid/` +
               `${encodeURIComponent(puuid)}/ids?count=${count}`;
  const res  = await axios.get(url, {
    headers: { "X-Riot-Token": API_KEY }
  });
  return res.data;
}

// 3) 매치 상세
export async function getMatchDetail(region, matchId) {
  const host = PLATFORM_HOSTS[region] || PLATFORM_HOSTS.kr;
  const url  = `https://${host}/tft/match/v1/matches/${encodeURIComponent(matchId)}`;
  const res  = await axios.get(url, {
    headers: { "X-Riot-Token": API_KEY }
  });
  return res.data;
}
