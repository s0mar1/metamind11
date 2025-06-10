// SummonerPage.jsx에서
{data.matches.map(match => <MatchCard key={match.matchId} match={match} />)}

// MatchCard.jsx
function MatchCard({ match }) {
  // 매치 카드 하나의 UI와 로직만 담당
  return (
    <li style={{ backgroundColor: getPlacementColor(match.placement) }}>
      {/* ... 순위, 덱, 유닛 정보 등 ... */}
    </li>
  );
}