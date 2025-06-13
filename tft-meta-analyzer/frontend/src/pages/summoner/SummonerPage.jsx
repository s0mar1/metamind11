import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import axios from 'axios';

/* ───────────────────────── 스타일 객체 ───────────────────────── */
const styles = {
  container: { paddingTop: '2rem', paddingBottom: '4rem' },
  error    : { color: '#E74C3C', textAlign: 'center', padding: '2rem', backgroundColor: '#FFFFFF', borderRadius: '8px' },
  loading  : { padding: '2rem', textAlign: 'center', color: '#6E6E6E' },

  matchCardWrapper: { backgroundColor: '#FFFFFF', borderLeft: '5px solid', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  matchCard: { display: 'flex', gap: '1.5rem', alignItems: 'center' },

  matchInfo: { flexShrink: 0, width: '90px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px' },
  placement: { fontSize: '1.25rem', fontWeight: 'bold' },
  level    : { fontSize: '0.8rem', color: '#6E6E6E' },
  date     : { fontSize: '0.75rem', color: '#A0AEC0' },

  matchDetails: { flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' },
  traitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  traitIconWrapper: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' },
  traitImg : { width: '16px', height: '16px' },
  traitTier: { fontWeight: 'bold' },

  unitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' },
  unit     : { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44px', gap: '2px' },
  unitImage: { width: '40px', height: '40px', borderRadius: '4px' },

  starsContainer: { display: 'flex', fontSize: '0.8rem', textShadow: '0 0 2px white', height: '12px' },
  itemsContainer: { display: 'flex', justifyContent: 'center', gap: '1px', height: '14px', marginTop: '1px' },
  itemImage: { width: '14px', height: '14px', borderRadius: '2px' },
};

/* ───────────────────────── 헬퍼 함수 ───────────────────────── */
const getPlacementColor = (p) => (p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280');

const borderColors = {1:'#6B7280',2:'#16A34A',3:'#3B82F6',4:'#9333EA',5:'#FBBF24'};
const getCostBorderStyle = (cost) => ({ border: `2px solid ${borderColors[cost] || borderColors[1]}` });

const costColors = {1:'#A0AEC0',2:'#4ADE80',3:'#60A5FA',4:'#C084FC',5:'#FBBF24'};
const getCostColor = (cost) => costColors[cost] || costColors[1];

const getTraitStyle = (name) => {
  const m = {
    bronze   : { bg:'#4a2b16', text:'#CD7F32' },
    silver   : { bg:'#435a70', text:'#C0C0C0' },
    gold     : { bg:'#b37800', text:'#FFD700' },
    prismatic: { bg:'#8636a1', text:'#FF7DFF' },
    chromatic: { bg:'#E13434', text:'#FF6363' },
  };
  return { backgroundColor: (m[name]?.bg || '#374151'), color: (m[name]?.text || '#6E6E6E') };
};

/* ───────────────────────── 재사용 컴포넌트 ───────────────────────── */
const Trait = ({ trait }) => (
  <div style={{ ...styles.traitIconWrapper, ...getTraitStyle(trait.style) }} title={trait.name}>
    {trait.image_url && <img src={trait.image_url} alt={trait.name} style={styles.traitImg} onError={(e)=>e.target.style.display='none'} />}
    <span style={styles.traitTier}>{trait.tier_current}</span>
  </div>
);

const Item = ({ item }) =>
  item.image_url && (
    <img
      src={item.image_url}
      alt={item.name}
      style={styles.itemImage}
      onError={(e) => (e.target.style.display = 'none')}
    />
  );

const Unit = ({ unit }) => {
  const cost = unit.cost ?? ((unit.rarity ?? 0) + 1);
  const star = unit.star ?? unit.tier ?? 1;
  return (
    <div style={styles.unit}>
      <div style={{ ...styles.starsContainer, color: getCostColor(cost) }}>{'★'.repeat(star)}</div>
      {unit.image_url && (
        <img
          src={unit.image_url}
          alt={unit.character_id}
          style={{ ...styles.unitImage, ...getCostBorderStyle(cost) }}
          onError={(e) => (e.target.style.display = 'none')}
        />
      )}
      {unit.items?.length > 0 && (
        <div style={styles.itemsContainer}>
          {unit.items.map((item, i) => <Item key={i} item={item} />)}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── MatchCard ───────────────────────── */
const MatchCard = ({ match }) => {
  const sortedTraits = [...(match.traits || [])].sort((a, b) => b.styleOrder - a.styleOrder);

  return (
    <div style={{ ...styles.matchCardWrapper, borderLeftColor: getPlacementColor(match.placement) }}>
      <div style={styles.matchCard}>
        {/* 왼쪽 요약 */}
        <div style={styles.matchInfo}>
          <div style={{ ...styles.placement, color: getPlacementColor(match.placement) }}>#{match.placement}</div>
          <div style={styles.level}>레벨 {match.level}</div>
          <div style={styles.date}>{match.dateString}</div>
        </div>

        {/* 오른쪽 상세 */}
        <div style={styles.matchDetails}>
          <div style={styles.traitsContainer}>
            {sortedTraits.map((t, i) => <Trait key={`${t.name}-${i}`} trait={t} />)}
          </div>
          <div style={styles.unitsContainer}>
            {(match.units || []).map((u, i) => <Unit key={`${u.character_id}-${i}`} unit={u} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── 메인 페이지 ───────────────────────── */
function SummonerPage() {
  const { region } = useParams();              // /summoner/:region
  const [searchParams] = useSearchParams();    // ?gameName=&tagLine=

  const [loading, setLoading] = useState(true);
  const [error  , setError]   = useState(null);
  const [data   , setData]    = useState(null);

  useEffect(() => {
    const gameName = searchParams.get('gameName');
    const tagLine  = searchParams.get('tagLine');

    if (!region || !gameName || !tagLine) {
      setLoading(false);
      setError('URL에 gameName 과 tagLine 이 필요합니다.');
      return;
    }

    const fetchData = async () => {
      setLoading(true); setError(null); setData(null);
      try {
        const queryString = new URLSearchParams({
          name: gameName.trim(),
          tag : tagLine.trim().toUpperCase(),
        }).toString();

        const res = await axios.get(`/api/summoner?${queryString}`);
        if (res.status !== 200) throw new Error(res.data.error || '알 수 없는 에러');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [region, searchParams]);

  if (loading) return <div style={styles.loading}>전적을 불러오는 중입니다…</div>;
  if (error)   return <div style={styles.error}>{error}</div>;
  if (!data)   return null;

  const matches = data.matches || [];

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        {data.profile?.gameName}#{data.profile?.tagLine}
      </h2>

      {matches.length ? (
        matches.map((m, i) => <MatchCard key={`${m.matchId}-${i}`} match={m} />)
      ) : (
        <div style={{ ...styles.loading, backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
          최근 랭크 게임 전적이 없습니다.
        </div>
      )}
    </div>
  );
}

export default SummonerPage;
