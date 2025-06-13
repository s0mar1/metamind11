import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import axios from 'axios';

// 헬퍼 컴포넌트들을 파일 상단에 배치하여 가독성 향상
const styles = { 
    container: { paddingTop: '2rem' }, 
    header: { marginBottom: '2rem' }, 
    error: { color: '#E74C3C' }, 
    profileCard: { display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    profileIcon: { width: '80px', height: '80px', borderRadius: '8px', backgroundColor: '#E6E6E6' },
    profileName: { fontSize: '1.875rem', fontWeight: 'bold', color: '#2E2E2E' },
    profileRank: { fontSize: '1.125rem', color: '#6E6E6E', fontWeight: 'semibold' },
    statsSummary: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '1rem' },
    statItem: { textAlign: 'center' },
    statValue: { fontSize: '1.25rem', fontWeight: 'bold', color: '#2E2E2E' },
    statLabel: { fontSize: '0.875rem', color: '#6E6E6E' },
    matchCardWrapper: { backgroundColor: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem' },
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
    starsContainer: { display: 'flex', fontSize: '1rem', textShadow: '0 0 2px white', height: '16px' }, 
    itemsContainer: { display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }, 
    itemImage: { width: '15px', height: '15px', borderRadius: '2px', border: '1px solid #E6E6E6' },
    detailButton: { cursor: 'pointer', backgroundColor: 'transparent', color: '#6E6E6E', fontSize: '1.5rem', border: 'none', padding: '0.5rem' },
    detailViewContainer: { borderTop: '1px solid #E6E6E6', padding: '1rem 0 0 0', marginTop: '1rem' },
    tabContainer: { display: 'flex', gap: '1rem', borderBottom: '1px solid #E6E6E6', marginBottom: '1rem' },
    tabButton: "py-2 px-4 font-semibold text-text-secondary border-b-2 border-transparent hover:text-text-primary transition-colors",
    activeTab: "text-brand-mint border-brand-mint",
    aiAnalysisButton: { cursor: 'pointer', backgroundColor: '#3ED2B9', color: 'white', padding: '10px 15px', borderRadius: '4px', border: 'none', fontSize: '1rem', fontWeight: 'bold' },
};
const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getPlacementColor = (placement) => { if (placement === 1) return '#B89D29'; if (placement <= 4) return '#156293'; return '#6E6E6E'; };
const getCostBorderStyle = (cost) => ({ border: `2px solid ${costColors[cost] || costColors[1]}` });
const getCostColor = (cost) => costColors[cost] || costColors[1];

const Trait = ({ trait }) => ( <div style={styles.traitIcon}> <span style={{fontWeight: 'bold'}}>{trait.tier_current}</span><span>{trait.name}</span></div> );
const Item = ({ item }) => ( <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name} /> );
const Unit = ({ unit }) => ( <div style={styles.unit}> <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}> {'★'.repeat(unit.tier)} </div> <div> <img src={unit.image_url} alt={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }} title={unit.name} /> <div style={styles.itemsContainer}> {unit.items.map((item, index) => item.image_url && <Item key={index} item={item} />)} </div> </div> </div> );

const ProfileCard = ({ account, league, matches }) => {
    if (!account) return null;
    const totalGames = matches.length;
    const top4Count = matches.filter(m => m.placement <= 4).length;
    const winCount = matches.filter(m => m.placement === 1).length;
    const avgPlacement = totalGames > 0 ? (matches.reduce((sum, m) => sum + m.placement, 0) / totalGames).toFixed(2) : 0;
    const profileIconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`;

    return (
        <div className="mb-8">
            <div style={styles.profileCard}>
                <img src={profileIconUrl} alt="profile icon" style={styles.profileIcon} onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }} />
                <div>
                    <h2 style={styles.profileName}>{account.gameName}#{account.tagLine}</h2>
                    <p style={styles.profileRank}>
                        {league ? `${league.tier} ${league.rank} - ${league.leaguePoints} LP` : 'Unranked'}
                    </p>
                </div>
            </div>
            {totalGames > 0 && (
                <div style={styles.statsSummary}>
                    <div style={styles.statItem}><p style={styles.statValue}>{avgPlacement}</p><p style={styles.statLabel}>평균 등수</p></div>
                    <div style={styles.statItem}><p style={styles.statValue}>{((top4Count / totalGames) * 100).toFixed(1)}%</p><p style={styles.statLabel}>순방률</p></div>
                    <div style={styles.statItem}><p style={styles.statValue}>{((winCount / totalGames) * 100).toFixed(1)}%</p><p style={styles.statLabel}>1등률</p></div>
                    <div style={styles.statItem}><p style={styles.statValue}>{totalGames} 게임</p><p style={styles.statLabel}>분석된 게임</p></div>
                </div>
            )}
        </div>
    );
};

const MatchCard = ({ match, userPuuid }) => (
    <div style={styles.matchCardWrapper}>
        <div style={styles.matchCard}>
            <div style={styles.matchInfo}>
                <div style={{ ...styles.placement, color: getPlacementColor(match.placement) }}>#{match.placement}</div>
                <div>Round {match.last_round}</div>
                <div style={{ fontSize: '0.8rem' }}>{new Date(match.game_datetime).toLocaleDateString()}</div>
            </div>
            <div style={styles.matchDetails}>
                <div style={styles.matchDetailsHeader}>
                    <div style={styles.traitsContainer}>
                        {match.traits.map((trait, index) => <Trait key={index} trait={trait} />)}
                    </div>
                </div>
                <div style={styles.unitsContainer}>
                    {match.units.map((unit, index) => unit.image_url && <Unit key={index} unit={unit} />)}
                </div>
            </div>
        </div>
    </div>
);

function SummonerPage() {
  const { region } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
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
        const queryString = new URLSearchParams({ region, gameName, tagLine }).toString();
        const response = await axios.get(`/api/summoner?${queryString}`);
        if (response.status !== 200) { throw new Error(response.data.error || '알 수 없는 에러'); }
        setData(response.data);
      } catch (err) { setError(err.message); } 
      finally { setLoading(false); }
    };
    fetchSummonerData();
  }, [region, searchParams]);

  if (loading) return <div className="p-8 text-center text-text-secondary">전적을 불러오는 중입니다...</div>;
  if (error) return <div className="p-8 text-center text-error-red">에러: {error}</div>;
  if (!data) return null;

  return (
    <div className="pt-8">
      <ProfileCard account={data?.account} league={data?.league} matches={data?.matches || []} />
      <section>
        {data.matches && data.matches.length > 0 ? (
          <div className="space-y-3">
            {data.matches.map((match) => (
              <MatchCard key={match.matchId} match={match} userPuuid={data?.account?.puuid} />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary py-8">최근 랭크 게임 전적이 없습니다.</p>
        )}
      </section>
    </div>
  );
}

export default SummonerPage;