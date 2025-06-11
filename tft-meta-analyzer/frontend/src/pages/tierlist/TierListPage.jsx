import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- 스타일 객체 ---
const styles = {
  container: { paddingTop: '2rem', paddingBottom: '4rem' },
  title: { fontSize: '2.25rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem', color: '#2E2E2E' },
  subtitle: { textAlign: 'center', color: '#6E6E6E', marginBottom: '2rem' },
  loadingError: { padding: '2rem', textAlign: 'center', color: '#6E6E6E' },
  deckListContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  deckCard: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', borderLeft: '5px solid' },
  col1: { flexShrink: 0, width: '220px', display: 'flex', alignItems: 'center', gap: '16px' },
  tierBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '4px' },
  tierText: { fontSize: '1.5rem', fontWeight: 'bold', color: 'white' },
  deckName: { fontWeight: 'bold', fontSize: '1.1rem', color: '#2E2E2E' },
  traitName: { fontSize: '0.8rem', color: '#6E6E6E' },
  col2: { flexGrow: 1, display: 'flex', gap: '6px', alignItems: 'flex-start' },
  unitWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '52px' },
  unitImage: { width: '48px', height: '48px', borderRadius: '4px' },
  unitItems: { display: 'flex', justifyContent: 'center', gap: '1px', height: '16px', marginTop: '2px' },
  unitItemImage: { width: '16px', height: '16px', borderRadius: '2px' },
  unitName: { fontSize: '12px', color: '#6E6E6E', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  col3: { flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'right', width: '280px', gap: '16px' },
  statValue: { fontWeight: 'bold', fontSize: '1.1rem', color: '#2E2E2E' },
  statLabel: { fontSize: '12px', color: '#6E6E6E' },
  col4: { flexShrink: 0 },
  expandButton: { color: '#6E6E6E', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' },
};

// --- 헬퍼 함수 ---
const getTierColor = (tierRank) => {
  const colorMap = { S: '#E13434', A: '#B45AF3', B: '#2C98F0', C: '#20B359' };
  return colorMap[tierRank] || '#6E6E6E';
};
const getCostBorderStyle = (cost) => {
  const colorMap = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
  return { border: `2px solid ${colorMap[cost] || colorMap[1]}` };
};

// --- 재사용 컴포넌트 ---
const UnitWithItems = ({ unit }) => {
  if (!unit || !unit.image_url) return <div style={styles.unitWrapper}></div>;
  return (
    <div style={styles.unitWrapper}>
      <img src={unit.image_url} alt={unit.name} title={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }}/>
      <div style={styles.unitItems}>
        {unit.recommendedItems?.slice(0, 3).map((item, index) =>
          item.image_url && <img key={index} src={item.image_url} alt={item.name} title={item.name} style={styles.unitItemImage} />
        )}
      </div>
      <span style={styles.unitName}>{unit.name}</span>
    </div>
  );
};

const DeckCard = ({ deck }) => {
  const tierColor = getTierColor(deck.tierRank);
  const top4Rate = deck.totalGames > 0 ? ((deck.top4Count / deck.totalGames) * 100).toFixed(1) : 0;
  const winRate = deck.totalGames > 0 ? ((deck.winCount / deck.totalGames) * 100).toFixed(1) : 0;

  return (
    <div style={{ ...styles.deckCard, borderLeftColor: tierColor }}>
      {/* 1열: 티어, 덱 이름 */}
      <div style={styles.col1}>
        <div style={{...styles.tierBadge, backgroundColor: tierColor}}>
          <span style={styles.tierText}>{deck.tierRank}</span>
        </div>
        <div>
          <h3 style={styles.deckName}>{deck.mainTraitName} {deck.carryChampionName}</h3>
        </div>
      </div>

      {/* 2열: 핵심 유닛 및 추천 아이템 */}
      <div style={styles.col2}>
        {deck.coreUnits?.map(unit => <UnitWithItems key={unit.apiName || unit.name} unit={unit} />)}
      </div>

      {/* 3열: 통계 데이터 */}
      <div style={styles.col3}>
        <div><p style={styles.statValue}>{deck.averagePlacement.toFixed(2)}</p><p style={styles.statLabel}>평균 등수</p></div>
        <div><p style={{...styles.statValue, color: '#3B82F6'}}>{top4Rate}%</p><p style={styles.statLabel}>Top 4</p></div>
        <div><p style={{...styles.statValue, color: '#F59E0B'}}>{winRate}%</p><p style={styles.statLabel}>1등</p></div>
        <div><p style={styles.statValue}>{deck.totalGames}</p><p style={styles.statLabel}>게임 수</p></div>
      </div>
      
      {/* 4열: 상세보기 버튼 */}
      <div style={styles.col4}><button style={styles.expandButton}>▼</button></div>
    </div>
  );
};

// --- 메인 페이지 컴포넌트 ---
function TierListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tierData, setTierData] = useState([]);

  useEffect(() => {
    const fetchTierData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/tierlist');
        setTierData(response.data);
      } catch (err) { setError('덱 티어 정보를 불러오는 데 실패했습니다. 서버를 확인해 주세요.'); }
      finally { setLoading(false); }
    };
    fetchTierData();
  }, []);
  
  if (loading) return <div style={styles.loadingError}>티어리스트를 분석 중입니다...</div>;
  if (error) return <div style={{ ...styles.loadingError, color: '#E74C3C' }}>{error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>실시간 덱 티어리스트</h1>
      <p style={styles.subtitle}>최신 랭커 데이터를 기반으로 집계된 티어리스트입니다.</p>
      
      {tierData.length > 0 ? (
        <div style={styles.deckListContainer}>
          {tierData.map((deck) => <DeckCard key={deck.deckKey} deck={deck} />)}
        </div>
      ) : (
        <div style={styles.loadingError}>
          아직 분석된 덱 티어 정보가 없습니다. <br />
          데이터 수집 및 분석이 완료될 때까지 기다려주세요. (매시간 분석이 갱신됩니다)
        </div>
      )}
    </div>
  );
}

export default TierListPage;