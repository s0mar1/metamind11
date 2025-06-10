import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// --- 스타일 및 헬퍼 컴포넌트 (변경 없음) ---
const styles = { 
    container: { paddingTop: '2rem' }, 
    header: { marginBottom: '2rem' }, 
    error: { color: '#E53E3E' }, 
    matchCardWrapper: { backgroundColor: '#2D3748', border: '1px solid #4A5568', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem' },
    matchCard: { display: 'flex', gap: '1.5rem', alignItems: 'center' }, 
    matchInfo: { flex: '0 0 100px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' },
    placement: { fontSize: '1.5rem', fontWeight: 'bold' }, 
    matchDetails: { flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem' }, 
    matchDetailsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    traitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }, 
    traitIcon: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1A202C', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' }, 
    unitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }, 
    unit: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '48px', gap: '4px' },
    unitImage: { width: '100%', borderRadius: '4px', display: 'block' }, 
    starsContainer: { display: 'flex', fontSize: '1rem', textShadow: '0 0 3px black', height: '16px' }, 
    itemsContainer: { display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }, 
    itemImage: { width: '15px', height: '15px', borderRadius: '2px', border: '1px solid #555' },
    detailButton: { cursor: 'pointer', backgroundColor: 'transparent', color: '#A0AEC0', fontSize: '1.5rem', border: 'none', padding: '0.5rem' },
    detailViewContainer: { borderTop: '1px solid #4A5568', padding: '1rem 0 0 0', marginTop: '1rem' },
    // ⬇️⬇️⬇️ 탭 관련 스타일 추가 ⬇️⬇️⬇️
    tabContainer: { display: 'flex', gap: '1rem', borderBottom: '1px solid #4A5568', marginBottom: '1rem' },
    tabButton: { background: 'none', border: 'none', color: '#A0AEC0', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '2px solid transparent' },
    activeTab: { color: '#EAEAEA', borderBottom: '2px solid #3182CE' },
    aiAnalysisButton: { cursor: 'pointer', backgroundColor: '#3182CE', color: '#EAEAEA', padding: '10px 15px', borderRadius: '4px', border: 'none', fontSize: '1rem' }
};
const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getPlacementColor = (placement) => { if (placement === 1) return '#FFD700'; if (placement <= 4) return '#63B3ED'; return '#A0AEC0'; };
const getCostBorderStyle = (cost) => ({ border: `2px solid ${costColors[cost] || costColors[1]}` });
const getCostColor = (cost) => costColors[cost] || costColors[1];
const Trait = ({ trait }) => ( <div style={styles.traitIcon}> <img src={trait.image_url} alt={trait.name} style={{ width: '16px', height: '16px' }} title={trait.name} /> <span>{trait.tier_current}</span> </div> );
const Item = ({ item }) => ( <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name} /> );
const Unit = ({ unit }) => ( <div style={styles.unit}> <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}> {'★'.repeat(unit.tier)} </div> <div> <img src={unit.image_url} alt={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }} title={unit.name} /> <div style={styles.itemsContainer}> {unit.items.map((item, index) => item.image_url && <Item key={index} item={item} />)} </div> </div> </div> );

// --- AI 분석 탭 컴포넌트 (초안) ---
const AIAnalysisView = ({ matchId, userPuuid }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState('');

    const handleAnalysis = async () => {
        setLoading(true);
        setError(null);
        setResult('');

        try {
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ matchId, userPuuid }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'AI 분석 중 에러가 발생했습니다.');
            }

            setResult(data.analysis);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 로딩 중일 때 버튼 스타일을 다르게 적용
    const buttonStyle = loading 
        ? { ...styles.aiAnalysisButton, backgroundColor: '#4A5568', cursor: 'not-allowed' } 
        : styles.aiAnalysisButton;

    return (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
            {error && <p style={styles.error}>{error}</p>}
            {result && <p style={{textAlign: 'left', whiteSpace: 'pre-wrap'}}>{result}</p>}

            {/* 결과가 없을 때만 버튼을 보여줍니다. */}
            {!result && (
              <button onClick={handleAnalysis} style={buttonStyle} disabled={loading}>
                  {loading ? 'AI가 게임을 분석 중입니다...' : '이 게임 분석하기'}
              </button>
            )}
        </div>
    );
};
// --- 펼쳐지는 상세 정보 컨텐츠 수정 ---
const MatchDetailContent = ({ matchId, userPuuid }) => {
    const [activeTab, setActiveTab] = useState('info'); // 'info' 또는 'ai'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailData, setDetailData] = useState(null);

    useEffect(() => {
        const fetchMatchData = async () => {
            try {
                const response = await fetch(`/api/match/${matchId}`);
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '매치 정보를 불러오는데 실패했습니다.');
                result.info.participants.sort((a, b) => a.placement - b.placement);
                setDetailData(result);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchMatchData();
    }, [matchId]);

    const PlayerCard = ({ participant }) => ( <div style={{...styles.matchCard, marginBottom: '0.5rem'}}> <div style={{...styles.matchInfo, flex: '0 0 150px'}}> <div style={{ ...styles.placement, color: getPlacementColor(participant.placement) }}>#{participant.placement}</div> <div style={{fontSize: '0.8rem', wordBreak: 'break-all'}} title={participant.puuid}>{`Player ${participant.placement}`}</div> </div> <div style={styles.matchDetails}> <div style={styles.traitsContainer}> {participant.traits.map((trait, index) => trait.image_url && <Trait key={index} trait={trait} />)} </div> <div style={styles.unitsContainer}> {participant.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)} </div> </div> </div> );

    return (
        <div>
            <div style={styles.tabContainer}>
                <button 
                    style={activeTab === 'info' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton}
                    onClick={() => setActiveTab('info')}
                >
                    종합 정보
                </button>
                <button 
                    style={activeTab === 'ai' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton}
                    onClick={() => setActiveTab('ai')}
                >
                    AI 분석
                </button>
            </div>

            {activeTab === 'info' && (
                loading ? <div>상세 정보 로딩 중...</div> :
                error ? <div style={styles.error}>에러: {error}</div> :
                <div> {detailData.info.participants.map(p => <PlayerCard key={p.puuid} participant={p} />)} </div>
            )}
            {activeTab === 'ai' && <AIAnalysisView matchId={matchId} userPuuid={userPuuid} />}
        </div>
    );
};


const MatchCard = ({ match, userPuuid, onToggle, isExpanded }) => ( 
    <div style={styles.matchCardWrapper}>
        <div style={styles.matchCard}>
            <div style={styles.matchInfo}> 
                <div style={{ ...styles.placement, color: getPlacementColor(match.placement) }}>#{match.placement}</div> 
                <div>Round {match.last_round}</div> 
                <div style={{ fontSize: '0.8rem' }}>{new Date(match.game_datetime).toLocaleDateString()}</div>
                <button onClick={() => onToggle(match.matchId)} style={styles.detailButton} title={isExpanded ? '간략히' : '상세보기'}>
                    {isExpanded ? '▲' : '▼'}
                </button>
            </div> 
            <div style={styles.matchDetails}>
                <div style={styles.matchDetailsHeader}>
                    <div style={styles.traitsContainer}> {match.traits.map((trait, index) => trait.image_url && <Trait key={index} trait={trait} />)} </div>
                </div>
                <div style={styles.unitsContainer}> {match.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)} </div> 
            </div> 
        </div>
        {isExpanded && ( <div style={styles.detailViewContainer}> <MatchDetailContent matchId={match.matchId} userPuuid={userPuuid} /> </div> )}
    </div>
);


function SummonerPage() {
  const [searchParams] = useSearchParams();
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const handleToggle = (matchId) => { setExpandedMatchId(prevId => (prevId === matchId ? null : matchId)); };

  useEffect(() => {
    setExpandedMatchId(null);
    const region = searchParams.get('region');
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    if (!region || !gameName || !tagLine) { setLoading(false); return; }
    const fetchSummonerData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const queryString = new URLSearchParams({ region, gameName, tagLine }).toString();
        const response = await fetch(`/api/summoner?${queryString}`);
        const result = await response.json();
        if (!response.ok) { throw new Error(result.error || '알 수 없는 에러가 발생했습니다.'); }
        setData(result);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    fetchSummonerData();
  }, [searchParams]);

  if (loading) return <div style={styles.container}>전적을 불러오는 중입니다...</div>;
  if (error) return <div style={{ ...styles.container, ...styles.error }}>에러: {error}</div>;
  if (!data) return <div style={styles.container}></div>; 

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>{data.account.gameName}#{data.account.tagLine}</h2>
      </header>
      <section>
        {data.matches && data.matches.length > 0 ? (
          <div>{data.matches.map((match) => (
            <MatchCard 
                key={match.matchId} 
                match={match}
                userPuuid={data.account.puuid} // ⬅️ 분석을 위해 현재 유저의 puuid를 전달합니다.
                onToggle={handleToggle}
                isExpanded={expandedMatchId === match.matchId}/>
          ))}</div>
        ) : (<p>최근 전적이 없습니다.</p>)}
      </section>
    </div>
  );
}

export default SummonerPage;