import React, { useState, useEffect } from 'react';
// ⬇️⬇️⬇️ useParams를 추가로 import 합니다. ⬇️⬇️⬇️
import { useSearchParams, useParams } from 'react-router-dom';

// AIAnalysisView, MatchDetailContent, MatchCard 등 모든 UI 컴포넌트와 스타일은
// 이전에 우리가 완성했던 그대로 사용합니다. 이 부분은 변경이 없습니다.
const styles = { 
    container: { paddingTop: '2rem' }, 
    header: { marginBottom: '2rem' }, 
    error: { color: '#E53E3E' }, 
    matchCardWrapper: { backgroundColor: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    matchCard: { display: 'flex', gap: '1.5rem', alignItems: 'center' }, 
    matchInfo: { flex: '0 0 100px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' },
    placement: { fontSize: '1.5rem', fontWeight: 'bold' }, 
    matchDetails: { flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem' }, 
    matchDetailsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    traitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }, 
    traitIcon: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F2F2F2', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', color: '#2E2E2E' }, 
    unitsContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }, 
    unit: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '48px', gap: '4px' },
    unitImage: { width: '100%', borderRadius: '4px', display: 'block' }, 
    starsContainer: { display: 'flex', fontSize: '1rem', textShadow: '0 0 2px white', height: '14px' }, 
    itemsContainer: { display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }, 
    itemImage: { width: '15px', height: '15px', borderRadius: '2px', border: '1px solid #E6E6E6' },
    detailButton: { cursor: 'pointer', backgroundColor: 'transparent', color: '#6E6E6E', fontSize: '1.5rem', border: 'none', padding: '0.5rem' },
    detailViewContainer: { borderTop: '1px solid #E6E6E6', padding: '1rem 0 0 0', marginTop: '1rem' },
    tabContainer: { display: 'flex', gap: '1rem', borderBottom: '1px solid #E6E6E6', marginBottom: '1rem' },
    tabButton: { background: 'none', border: 'none', color: '#6E6E6E', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '2px solid transparent', fontWeight: 'bold' },
    activeTab: { color: '#2E2E2E', borderBottom: `2px solid #3ED2B9` },
    aiAnalysisButton: { cursor: 'pointer', backgroundColor: '#3ED2B9', color: 'white', padding: '10px 15px', borderRadius: '4px', border: 'none', fontSize: '1rem', fontWeight: 'bold' }
};
const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getPlacementColor = (placement) => { if (placement === 1) return '#B89D29'; if (placement <= 4) return '#156293'; return '#6E6E6E'; };
const getCostBorderStyle = (cost) => ({ border: `2px solid ${costColors[cost] || costColors[1]}` });
const getCostColor = (cost) => costColors[cost] || costColors[1];
const Trait = ({ trait }) => ( <div style={styles.traitIcon}> <span>{trait.tier_current}</span> </div> );
const Item = ({ item }) => ( <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name} /> );
const Unit = ({ unit }) => ( <div style={styles.unit}> <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}> {'★'.repeat(unit.tier)} </div> <div> <img src={unit.image_url} alt={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }} title={unit.name} /> <div style={styles.itemsContainer}> {unit.items.map((item, index) => item.image_url && <Item key={index} item={item} />)} </div> </div> </div> );
const AIAnalysisView = ({ matchId, userPuuid }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState('');
    const handleAnalysis = async () => { setLoading(true); setError(null); setResult(''); try { const response = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, userPuuid }), }); const data = await response.json(); if (!response.ok) { throw new Error(data.error || 'AI 분석 중 에러가 발생했습니다.'); } setResult(data.analysis); } catch (err) { setError(err.message); } finally { setLoading(false); } };
    const buttonStyle = loading ? { ...styles.aiAnalysisButton, backgroundColor: '#A0AEC0', cursor: 'not-allowed' } : styles.aiAnalysisButton;
    return ( <div style={{ padding: '1rem', textAlign: 'center' }}> {error && <p style={styles.error}>{error}</p>} {result && <p style={{textAlign: 'left', whiteSpace: 'pre-wrap'}}>{result}</p>} {!result && !error && ( <button onClick={handleAnalysis} style={buttonStyle} disabled={loading}> {loading ? 'AI가 게임을 분석 중입니다...' : '이 게임 분석하기'} </button> )} </div> );
};
const MatchDetailContent = ({ matchId, userPuuid }) => {
    const [activeTab, setActiveTab] = useState('info'); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [detailData, setDetailData] = useState(null);
    useEffect(() => { const fetchMatchData = async () => { try { const response = await fetch(`/api/match/${matchId}`); const result = await response.json(); if (!response.ok) throw new Error(result.error || '매치 정보를 불러오는데 실패했습니다.'); result.info.participants.sort((a, b) => a.placement - b.placement); setDetailData(result); } catch (err) { setError(err.message); } finally { setLoading(false); } }; fetchMatchData(); }, [matchId]);
    const PlayerCard = ({ participant }) => ( <div style={{...styles.matchCard, marginBottom: '0.5rem'}}> <div style={{...styles.matchInfo, flex: '0 0 150px'}}> <div style={{ ...styles.placement, color: getPlacementColor(participant.placement) }}>#{participant.placement}</div> <div style={{fontSize: '0.8rem', wordBreak: 'break-all'}} title={participant.puuid}>{`Player ${participant.placement}`}</div> </div> <div style={styles.playerDetails}> <div style={styles.traitsContainer}> {participant.traits.map((trait, index) => <Trait key={index} trait={trait} />)} </div> <div style={styles.unitsContainer}> {participant.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)} </div> </div> </div> );
    return ( <div> <div style={styles.tabContainer}> <button style={activeTab === 'info' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton} onClick={() => setActiveTab('info')}> 종합 정보 </button> <button style={activeTab === 'ai' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton} onClick={() => setActiveTab('ai')}> AI 분석 </button> </div> {activeTab === 'info' && ( loading ? <div>상세 정보 로딩 중...</div> : error ? <div style={styles.error}>에러: {error}</div> : <div> {detailData.info.participants.map(p => <PlayerCard key={p.puuid} participant={p} />)} </div> )} {activeTab === 'ai' && <AIAnalysisView matchId={matchId} userPuuid={userPuuid} />} </div> );
};
const MatchCard = ({ match, userPuuid, onToggle, isExpanded }) => ( <div style={styles.matchCardWrapper}> <div style={styles.matchCard}> <div style={styles.matchInfo}> <div style={{ ...styles.placement, color: getPlacementColor(match.placement) }}>#{match.placement}</div> <div>Round {match.last_round}</div> <div style={{ fontSize: '0.8rem' }}>{new Date(match.game_datetime).toLocaleDateString()}</div> </div> <div style={styles.matchDetails}> <div style={styles.matchDetailsHeader}> <div style={styles.traitsContainer}> {match.traits.map((trait, index) => <Trait key={index} trait={trait} />)} </div> <button onClick={() => onToggle(match.matchId)} style={styles.detailButton} title={isExpanded ? '간략히' : '상세보기'}> {isExpanded ? '▲' : '▼'} </button> </div> <div style={styles.unitsContainer}> {match.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)} </div> </div> </div> {isExpanded && ( <div style={styles.detailViewContainer}> <MatchDetailContent matchId={match.matchId} userPuuid={userPuuid} /> </div> )} </div> );


function SummonerPage() {
  // ⬇️⬇️⬇️ useParams와 useSearchParams를 모두 사용합니다. ⬇️⬇️⬇️
  const { region } = useParams(); 
  const [searchParams] = useSearchParams();
  
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const handleToggle = (matchId) => { setExpandedMatchId(prevId => (prevId === matchId ? null : matchId)); };

  // ⬇️⬇️⬇️ useEffect 훅 전체를 새로운 로직으로 교체합니다. ⬇️⬇️⬇️
  useEffect(() => {
    setExpandedMatchId(null);

    // URL 경로에서 region을, 쿼리 스트링에서 나머지를 가져옵니다.
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');

    // region 파라미터가 있는지 확인합니다.
    if (!region || !gameName || !tagLine) {
      setLoading(false);
      setError('필요한 정보가 URL에 없습니다.');
      return;
    }

    const fetchSummonerData = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        // 백엔드 API 호출 시, region 정보를 포함한 쿼리 스트링을 다시 만듭니다.
        const queryString = new URLSearchParams({ region, gameName, tagLine }).toString();
        const response = await fetch(`/api/summoner?${queryString}`);
        const result = await response.json();
        if (!response.ok) { throw new Error(result.error || '알 수 없는 에러가 발생했습니다.'); }
        setData(result);
      } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    fetchSummonerData();
  }, [region, searchParams]); // 의존성 배열에 region과 searchParams를 모두 추가

  if (loading) return <div className="p-8 text-center text-text-secondary">전적을 불러오는 중입니다...</div>;
  if (error) return <div className="p-8 text-center text-error-red">에러: {error}</div>;
  if (!data) return null; // 데이터가 없는 초기 상태에서는 아무것도 보여주지 않음

  return (
    <div className="pt-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-center text-text-primary">{data.account.gameName}#{data.account.tagLine}</h2>
      </header>
      <section>
        {data.matches && data.matches.length > 0 ? (
          <div className="space-y-3">
            {data.matches.map((match) => (
              <MatchCard 
                key={match.matchId} 
                match={match}
                userPuuid={data.account.puuid}
                onToggle={handleToggle}
                isExpanded={expandedMatchId === match.matchId}/>
            ))}
          </div>
        ) : (<p className="text-center text-text-secondary">최근 랭크 게임 전적이 없습니다.</p>)}
      </section>
    </div>
  );
}

export default SummonerPage;