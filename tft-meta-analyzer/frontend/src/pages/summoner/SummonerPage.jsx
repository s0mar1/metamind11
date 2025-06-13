import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import axios from 'axios';

// --- 스타일 객체 (UI 최종 조정) ---
const styles = {
    container: { paddingTop: '2rem', paddingBottom: '4rem' },
    error: { color: '#E74C3C', textAlign: 'center', padding: '2rem', backgroundColor: '#FFFFFF', borderRadius: '8px' },
    loading: { padding: '2rem', textAlign: 'center', color: '#6E6E6E' },
    matchCardWrapper: { backgroundColor: '#FFFFFF', borderLeft: '5px solid', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    matchCard: { display: 'flex', gap: '1.5rem', alignItems: 'center' },
    matchInfo: { flexShrink: 0, width: '90px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px' },
    placement: { fontSize: '1.25rem', fontWeight: 'bold' },
    level: { fontSize: '0.8rem', color: '#6E6E6E' },
    date: { fontSize: '0.75rem', color: '#A0AEC0' },
    matchDetails: { flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' },
    traitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
    traitIconWrapper: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' },
    traitImg: { width: '16px', height: '16px' },
    traitTier: { fontWeight: 'bold' },
    unitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' },
    unit: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44px', gap: '2px' },
    unitImage: { width: '40px', height: '40px', borderRadius: '4px' },
    starsContainer: { display: 'flex', fontSize: '0.8rem', textShadow: '0 0 2px white', height: '12px' },
    itemsContainer: { display: 'flex', justifyContent: 'center', gap: '1px', height: '14px', marginTop: '1px' },
    itemImage: { width: '14px', height: '14px', borderRadius: '2px' },
};

// --- 헬퍼 함수 ---
const getPlacementColor = (placement) => { if (placement === 1) return '#F59E0B'; if (placement <= 4) return '#3B82F6'; return '#6B7280'; };
const getCostBorderStyle = (cost) => { const c = {1:'#6B7280',2:'#16A34A',3:'#3B82F6',4:'#9333EA',5:'#FBBF24'}; return {border:`2px solid ${c[cost]||c[1]}`}; };
const getCostColor = (cost) => { const c = {1:'#A0AEC0',2:'#4ADE80',3:'#60A5FA',4:'#C084FC',5:'#FBBF24'}; return c[cost]||c[1]; };
const getTraitStyle = (styleName) => {
    const styleMap = {
        'bronze': { bg: '#4a2b16', text: '#CD7F32' },
        'silver': { bg: '#435a70', text: '#C0C0C0' },
        'gold': { bg: '#b37800', text: '#FFD700' },
        'prismatic': { bg: '#8636a1', text: '#FF7DFF' },
        'chromatic': { bg: '#E13434', text: '#FF6363' }
    };
    const selectedStyle = styleMap[styleName] || { bg: '#374151', text: '#6E6E6E'};
    return { backgroundColor: selectedStyle.bg, color: selectedStyle.text };
};

// --- 재사용 컴포넌트 ---
const Trait = ({ trait }) => (
    <div style={{...styles.traitIconWrapper, ...getTraitStyle(trait.style)}} title={trait.name}>
        <img src={trait.image_url} alt={trait.name} style={styles.traitImg} onError={(e)=>e.target.style.display='none'}/>
        <span style={styles.traitTier}>{trait.tier_current}</span>
    </div>
);
const Item = ({ item }) => ( <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name} onError={(e)=>e.target.style.display='none'} /> );
const Unit = ({ unit }) => ( <div style={styles.unit}> <div style={{...styles.starsContainer, color: getCostColor(unit.cost)}}>{'★'.repeat(unit.tier)}</div> <img src={unit.image_url} alt={unit.name} style={{...styles.unitImage, ...getCostBorderStyle(unit.cost)}}/> <div style={styles.itemsContainer}>{unit.items.map((item, i) => item.image_url && <Item key={i} item={item}/>)}</div> </div> );

const MatchCard = ({ match }) => {
    // 특성을 등급 순서(styleOrder)대로 정렬
    const sortedTraits = [...match.traits].sort((a, b) => b.styleOrder - a.styleOrder);
    return (
        <div style={{ ...styles.matchCardWrapper, borderLeftColor: getPlacementColor(match.placement) }}>
            <div style={styles.matchCard}>
                <div style={styles.matchInfo}>
                    <div style={{...styles.placement, color: getPlacementColor(match.placement)}}>#{match.placement}</div>
                    <div style={styles.level}>레벨 {match.level}</div>
                    <div style={styles.date}>{new Date(match.game_datetime).toLocaleDateString()}</div>
                </div>
                <div style={styles.matchDetails}>
                    <div style={styles.traitsContainer}>
                        {sortedTraits.map((trait, index) => <Trait key={index} trait={trait} />)}
                    </div>
                    <div style={styles.unitsContainer}>
                        {match.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

function SummonerPage() {
  const { region } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    if (!region || !gameName || !tagLine) { setLoading(false); setError('필요한 정보가 URL에 없습니다.'); return; }
    const fetchSummonerData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const queryString = new URLSearchParams({ region, gameName, tagLine }).toString();
        const response = await axios.get(`/api/summoner?${queryString}`);
        if (response.status !== 200) { throw new Error(response.data.error || '알 수 없는 에러'); }
        setData(response.data);
      } catch (err) { setError(err.response?.data?.error || err.message); } 
      finally { setLoading(false); }
    };
    fetchSummonerData();
  }, [region, searchParams]);

  if (loading) return <div style={styles.loading}>전적을 불러오는 중입니다...</div>;
  if (error) return <div style={styles.error}>에러: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2E2E2E'}}>{data.account?.gameName}#{data.account?.tagLine}</h2>
      <section>
        {data.matches && data.matches.length > 0 ? (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {data.matches.map((match) => ( <MatchCard key={match.matchId} match={match} /> ))}
          </div>
        ) : ( <div style={{...styles.loadingError, backgroundColor:'#FFFFFF', padding:'2rem', borderRadius:'8px'}}><p>최근 랭크 게임 전적이 없습니다.</p></div> )}
      </section>
    </div>
  );
}

export default SummonerPage;