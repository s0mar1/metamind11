// frontend/src/pages/tierlist/TierListPage.jsx
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
  unitWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '52px',
    position: 'relative',
  },
  unitImage: { width: '48px', height: '48px', borderRadius: '4px' },
  unitItems: { display: 'flex', justifyContent: 'center', gap: '1px', height: '16px', marginTop: '2px' },
  unitItemImage: { width: '16px', height: '16px', borderRadius: '2px' },
  unitName: { fontSize: '12px', color: '#6E6E6E', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  starBadge: { // 3성 기물용 작은 원형 뱃지
    position: 'absolute',
    top: '0px',
    right: '0px',
    backgroundColor: '#FFD700',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #C4A42C',
    zIndex: 1,
  },
  carryStars: { // 캐리/서브캐리 기물용 별 등급 표시
    position: 'absolute',
    bottom: '0px',
    width: '100%',
    textAlign: 'center',
    fontSize: '0.8rem', // 별 크기 조정
    color: '#FFD700', // 골드 색상
    fontWeight: 'bold',
    textShadow: '0 0 2px black',
    zIndex: 1,
  },
  col3: { flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'right', width: '280px', gap: '16px' },
  statValue: { fontWeight: 'bold', fontSize: '1.1rem', color: '#2E2E2E' },
  statLabel: { fontSize: '12px', color: '#6E6E6E' },
  col4: { flexShrink: 0 },
  expandButton: { color: '#6E6E6E', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' },
};

// --- 헬퍼 함수 ---
const getTierColor = (tierRank) => {
  const colorMap = { S: '#E13434', A: '#B45AF3', B: '#2C98F0', C: '#20B359', D: '#9E9E9E' };
  return colorMap[tierRank] || '#6E6E6E';
};
const getCostBorderStyle = (cost) => {
  const colorMap = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
  return { border: `2px solid ${colorMap[cost] || colorMap[1]}` };
};

// --- 재사용 컴포넌트 ---
const UnitWithItems = ({ unit, showItems, isMajorUnit }) => {
  if (!unit || !unit.image_url) return <div style={styles.unitWrapper}></div>;

  const displayedItems = showItems ? unit.recommendedItems?.slice(0, 3) : [];

  return (
    <div style={styles.unitWrapper}>
      <img src={unit.image_url} alt={unit.name} title={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }}/>
      {unit.tier === 3 && ( // 3성 기물은 항상 작은 원형 뱃지 표시
        <div style={styles.starBadge}>★</div>
      )}
      {isMajorUnit && unit.tier > 0 && ( // isMajorUnit이 true이고 1성 이상일 때만 별 등급 표시
        <div style={styles.carryStars}>{'★'.repeat(unit.tier)}</div>
      )}
      <div style={styles.unitItems}>
        {displayedItems.map((item, index) =>
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

  // coreUnits를 정렬: 캐리 챔피언이 맨 앞, 그 다음 코스트 오름차순, 같은 코스트 내 티어 내림차순
  const sortedCoreUnits = [...(deck.coreUnits || [])].sort((a, b) => {
    // 1. 캐리 챔피언을 최우선으로 배치
    const isA_Carry = a.name === deck.carryChampionName;
    const isB_Carry = b.name === deck.carryChampionName;

    if (isA_Carry && !isB_Carry) return -1;
    if (!isA_Carry && isB_Carry) return 1;

    // 2. 캐리가 아니라면 코스트 오름차순 (1코스트 -> 5코스트)
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    // 3. 같은 코스트 내에서는 티어(성) 내림차순 (3성 -> 2성 -> 1성)
    return b.tier - a.tier;
  });

  // 아이템 및 별 등급 표시를 위한 핵심 유닛 선정 로직 (최대 3명)
  // 1. 캐리 챔피언
  // 2. 나머지 유닛 중 4코스트 챔피언 (최대 2명 추가)
  // 3. 4코스트 챔피언이 부족하면 그 외의 고코스트/고티어 챔피언
  const majorUnitsToShowItemsAndStars = new Set();
  
  // 1. 캐리 챔피언 추가 (만약 있다면)
  const carryUnit = sortedCoreUnits.find(unit => unit.name === deck.carryChampionName);
  if (carryUnit) {
    majorUnitsToShowItemsAndStars.add(carryUnit.apiName);
  }

  // 2. 캐리가 아닌 4코스트 챔피언 중 최대 2명 추가
  const nonCarry4CostUnits = sortedCoreUnits.filter(unit => 
    unit.cost === 4 && unit.name !== deck.carryChampionName && !majorUnitsToShowItemsAndStars.has(unit.apiName)
  );
  for (let i = 0; i < Math.min(2, nonCarry4CostUnits.length); i++) {
    majorUnitsToShowItemsAndStars.add(nonCarry4CostUnits[i].apiName);
  }

  // 3. 여전히 3명이 안 되었다면, 남은 유닛 중 가장 중요한 순서대로 추가
  const remainingUnits = sortedCoreUnits.filter(unit => 
    !majorUnitsToShowItemsAndStars.has(unit.apiName)
  );
  for (let i = 0; majorUnitsToShowItemsAndStars.size < 3 && i < remainingUnits.length; i++) {
    majorUnitsToShowItemsAndStars.add(remainingUnits[i].apiName);
  }


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
        {sortedCoreUnits.map((unit) => (
          <UnitWithItems
            key={unit.apiName || unit.name}
            unit={unit}
            // 이 유닛이 아이템/별 등급 표시 대상 3명에 포함되는지 확인
            showItems={majorUnitsToShowItemsAndStars.has(unit.apiName)} 
            isMajorUnit={majorUnitsToShowItemsAndStars.has(unit.apiName)} 
          />
        ))}
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