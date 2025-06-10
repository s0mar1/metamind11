import express from "express";
import * as riot from "../services/riotApi.js";

const router = express.Router();

router.get("/:region/:name/:tag", async (req, res) => {
  const { region, name, tag } = req.params;
  try {
    // 1) 계정 정보
    const account = await riot.getAccountByRiotId(region, name, tag);

    // 2) 최근 5판 match IDs
    const matchIds = await riot.getMatchIds(region, account.puuid, 5);

    // 3) 매치 상세(fetch all in parallel)
    const details = await Promise.all(
      matchIds.map((m) => riot.getMatchDetail(region, m))
    );

    // 4) 우리 소환사 정보만 추려서
    const matches = details.map((match) => {
      const p = match.info.participants.find((p) => p.puuid === account.puuid);
      return {
        matchId: match.metadata.match_id,
        timestamp: match.info.game_datetime,
        game_length: match.info.game_length,
        placement: p.placement,
        traits: p.traits,
        units: p.units
      };
    });

    res.json({ summoner: account, matches });
  } catch (err) {
    console.error("❌ [SummonerRoute] error:", err.response?.status, err.response?.data);
    const code = err.response?.status || 500;
    res
      .status(code)
      .json({ error: err.response?.data?.status?.message || err.message });
  }
});

export default router;
