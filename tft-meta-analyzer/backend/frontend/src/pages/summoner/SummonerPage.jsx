import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SummonerPage() {
  const { region, name, tag } = useParams();
  const [data, setData]     = useState(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummoner() {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/summoner/${region}/${name}/${tag}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSummoner();
  }, [region, name, tag]);

  if (loading) return <p>로딩 중…</p>;
  if (error)   return <p style={{ color: "red" }}>에러: {error}</p>;

  const { summoner, matches } = data;
  return (
    <>
      <h2>소환사 정보</h2>
      <p>Region: {region}</p>
      <p>Name: {summoner.gameName}</p>
      <p>Tag: {summoner.tagLine}</p>

      <h3>최근 {matches.length}판</h3>
      <ul>
        {matches.map((m, i) => (
          <li key={i}>
            Match ID: {m.metadata.matchId} — Timestamp: {new Date(m.info.game_datetime).toLocaleString()}
          </li>
        ))}
      </ul>
    </>
  );
}
