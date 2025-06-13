import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import axios from 'axios';

// --- 스타일 객체 (라이트 모드) ---
const styles = {
    // ... (이전 답변의 스타일 객체와 거의 동일)
    // 프로필 카드, 통계 요약 카드 등을 위한 스타일 추가
    profileCard: { display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    profileIcon: { width: '80px', height: '80px', borderRadius: '8px' },
    profileInfo: {},
    profileName: { fontSize: '1.875rem', fontWeight: 'bold', color: '#2E2E2E' },
    profileRank: { fontSize: '1.125rem', color: '#6E6E6E', fontWeight: 'semibold' },
    statsSummary: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '1rem' },
    statItem: { textAlign: 'center' },
    statValue: { fontSize: '1.25rem', fontWeight: 'bold', color: '#2E2E2E' },
    statLabel: { fontSize: '0.875rem', color: '#6E6E6E' },
};

// --- 신규 컴포넌트: 프로필 카드 ---
const ProfileCard = ({ account, league, matches }) => {
    if (!account) return null;

    // 최근 10게임 통계 계산
    const totalGames = matches.length;
    const top4Count = matches.filter(m => m.placement <= 4).length;
    const winCount = matches.filter(m => m.placement === 1).length;
    const avgPlacement = totalGames > 0 ? (matches.reduce((sum, m) => sum + m.placement, 0) / totalGames).toFixed(2) : 0;
    
    const profileIconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`;

    return (
        <div className="mb-8">
            <div style={styles.profileCard}>
                <img src={profileIconUrl} alt="profile icon" style={styles.profileIcon} onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }} />
                <div style={styles.profileInfo}>
                    <h2 style={styles.profileName}>{account.gameName}#{account.tagLine}</h2>
                    <p style={styles.profileRank}>
                        {league ? `${league.tier} ${league.rank} - ${league.leaguePoints} LP` : 'Unranked'}
                    </p>
                </div>
            </div>
            {totalGames > 0 && (
                <div style={styles.statsSummary}>
                    <div style={styles.statItem}>
                        <p style={styles.statValue}>{avgPlacement}</p>
                        <p style={styles.statLabel}>평균 등수</p>
                    </div>
                    <div style={styles.statItem}>
                        <p style={styles.statValue}>{((top4Count / totalGames) * 100).toFixed(1)}%</p>
                        <p style={styles.statLabel}>순방률</p>
                    </div>
                    <div style={styles.statItem}>
                        <p style={styles.statValue}>{((winCount / totalGames) * 100).toFixed(1)}%</p>
                        <p style={styles.statLabel}>1등률</p>
                    </div>
                    <div style={styles.statItem}>
                        <p style={styles.statValue}>{totalGames} 게임</p>
                        <p style={styles.statLabel}>분석된 게임</p>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- SummonerPage 메인 컴포넌트 ---
function SummonerPage() {
    // ... (기존의 useState, useParams, useSearchParams 로직은 동일)
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
                // ⬇️⬇️⬇️ 이제 API는 account, league, matches 정보를 모두 반환합니다.
                const response = await axios.get(`/api/summoner?${queryString}`);
                if (response.status !== 200) { throw new Error(response.data.error || '알 수 없는 에러'); }
                setData(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSummonerData();
    }, [region, searchParams]);

    if (loading) return <div className="p-8 text-center text-text-secondary">전적을 불러오는 중입니다...</div>;
    if (error) return <div className="p-8 text-center text-error-red">에러: {error}</div>;
    if (!data) return null;

    return (
        <div className="pt-8">
            {/* ⬇️⬇️⬇️ 새로운 프로필 카드 컴포넌트 사용 ⬇️⬇️⬇️ */}
            <ProfileCard account={data.account} league={data.league} matches={data.matches} />

            <section>
                {data.matches && data.matches.length > 0 ? (
                    <div className="space-y-3">
                        {/* MatchCard는 이전에 만든 컴포넌트를 그대로 재활용합니다. */}
                        {data.matches.map((match) => (
                            <MatchCard key={match.matchId} match={match} userPuuid={data.account.puuid} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-text-secondary py-8">최근 랭크 게임 전적이 없습니다.</p>
                )}
            </section>
        </div>
    );
}

// ❗️ MatchCard 및 하위 컴포넌트(Unit, Item, Trait 등)는 이전 답변의 코드를 그대로 사용합니다.
// 이 파일 안에 함께 넣어주거나, 별도 파일로 분리하여 import해서 사용해야 합니다.
// 여기서는 코드의 간결함을 위해 생략합니다.

export default SummonerPage;