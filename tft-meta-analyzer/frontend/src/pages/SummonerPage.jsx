import React, { useEffect, useState } from "react";
import { useParams }                  from "react-router-dom";

// Data Dragon 버전 (실제 운영 시 최신 버전을 fetch 해도 됩니다)
const DDRAGON_VERSION = "14.5.1";
const CDN_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

// 1) 시너지 아이콘 (TFT trait)
//    (CommunityDragon 써도 되지만, 간단히 Riot 챔피언 패시브 아이콘 경로로 대체)
const traitIcon = (t) =>
  `${CDN_BASE}/img/passive/${t.name.toLowerCase()}.png`;

// 2) 챔피언 아이콘
const champIcon = (id) =>
  `${CDN_BASE}/img/champion/${id}.png`;

// 3) 아이템 아이콘
const itemIcon = (i) =>
  `${CDN_BASE}/img/item/${i}.png`;

export default function SummonerPage() {
  const { region, nameTag } = useParams();
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");
  const [summoner, setSummoner] = useState(null);
  const [matches,   setMatches] = useState([]);

  useEffect(() => {
    const [name, tag] = decodeURIComponent(nameTag).split("%23");
    fetch(`/summoner/${region}/${name}/${tag}`)
      .then((r) => {
        if (!r.ok) throw r;
        return r.json();
      })
      .then(({ summoner, matches }) => {
        setSummoner(summoner);
        setMatches(matches);
      })
      .catch(async (r) => {
        const msg = r.json ? (await r.json()).error : r.message;
        setError(`에러: ${msg}`);
      })
      .finally(() => setLoading(false));
  }, [region, nameTag]);

  if (loading) return <p>로딩 중…</p>;
  if (error)   return <p>{error}</p>;

  return (
    <div>
      <h1>소환사 정보</h1>
      <p><b>Region:</b> {region}</p>
      <p><b>Name:</b> {summoner.gameName}</p>
      <p><b>Tag:</b> {summoner.tagLine}</p>

      <h2>최근 {matches.length}판</h2>
      {matches.map((m) => (
        <div
          key={m.matchId}
          style={{
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: 12,
            marginBottom: 16
          }}
        >
          <div style={{ color: "#666", marginBottom: 8 }}>
            #{m.placement} • {Math.floor(m.game_length/60)}:
            {String(m.game_length%60).padStart(2,"0")} •{" "}
            {new Date(m.timestamp).toLocaleString()}
          </div>

          {/* 시너지 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {m.traits.map((t) => (
              <div key={t.name} style={{ textAlign: "center", width: 48 }}>
                <img src={traitIcon(t)} alt={t.name} width={32} />
                {t.tier_current > 0 && (
                  <div style={{ fontSize: 12 }}>
                    {t.tier_current}/{t.tier_total}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 챔피언 + 아이템 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {m.units.map((u) => (
              <div key={u.character_id} style={{ position: "relative", textAlign: "center", width: 56 }}>
                <img
                  src={champIcon(u.character_id)}
                  alt={u.character_id}
                  width={48}
                  style={{ borderRadius: 4 }}
                />
                <div style={{
                  position: "absolute",
                  bottom: -2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 12,
                  padding: "0 4px",
                  borderRadius: 3
                }}>
                  {"★".repeat(u.tier)}
                </div>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
                  {u.items.map((i) => (
                    <img
                      key={i}
                      src={itemIcon(i)}
                      alt={i}
                      width={20}
                      style={{ borderRadius: 2 }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
