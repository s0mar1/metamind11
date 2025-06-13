import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import axios from 'axios';

// --- 스타일 객체 (라이트 모드) ---
const styles = {
    profileCard: { display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    profileIcon: { width: '80px', height: '80px', borderRadius: '8px' },
    profileInfo: {},
    profileName: { fontSize: '1.875rem', fontWeight: 'bold', color: '#2E2E2E' },
    profileRank: { fontSize: '1.125rem', color: '#6E6E6E', fontWeight: 'semibold' },
    statsSummary: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '1rem' },
    statItem: { textAlign: 'center' },
    statValue: { fontSize: '1.25rem', fontWeight: 'bold', color: '#2E2E2E' },
    statLabel: { fontSize: '0.875rem', color: '#6E6E6E' },
    // MatchCard 스타일 추가 (기존 Tailwind 클래스와 조화되도록)
    matchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        marginBottom: '12px',
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
    },
    matchCardHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        borderLeftWidth: '4px', // border-l-4
        position: 'relative', // 화살표 버튼 배치를 위해
    },
    matchRankIcon: {
        width: '40px',
        height: '40px',
        marginRight: '12px',
    },
    // 상세보기 버튼 박스 스타일
    detailToggleBox: {
        position: 'absolute',
        top: '10px', // 상단 여백
        right: '10px', // 우측 여백
        width: '32px', // 박스 크기
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E5E7EB', // bg-gray-200
        borderRadius: '4px', // rounded
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
        '&:hover': {
            backgroundColor: '#D1D5DB', // hover:bg-gray-300
        }
    },
    detailToggleArrow: {
        fontSize: '1rem',
        color: '#4B5563', // text-gray-700
    },
    // 챔피언 유닛 스타일
    unitWrapper: {
        position: 'relative',
        width: '56px', // 기존 유지
        paddingTop: '20px', // 별 등급을 위한 충분한 공간 확보
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    unitImage: {
        width: '100%',
        borderRadius: '4px',
        display: 'block',
    },
    unitName: {
        fontSize: '0.7rem',
        textAlign: 'center',
        display: 'block',
        color: '#2E2E2E',
        marginTop: '6px', // 이름과 초상화 사이 간격 (기존 유지)
        wordBreak: 'break-all'
    },
    starsContainer: {
        position: 'absolute',
        top: '0px', // 별을 UnitWrapper의 가장 위쪽에 배치
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        fontSize: '1.1rem',
        // textShadow: '0 0 3px black, 0 0 3px black', // 별 음영 제거
    },
    itemImage: {
        width: '18px', // 아이템 크기 조정
        height: '18px',
        borderRadius: '2px',
        border: '1px solid #555',
    },
    unitItems: {
        display: 'flex',
        justifyContent: 'center',
        gap: '2px',
        marginTop: '2px',
    },
};

// --- 신규 컴포넌트: 프로필 카드 ---
const ProfileCard = ({ account, league, matches }) => {
    if (!account) return null;

    const totalGames = matches.length;
    const top4Count = matches.filter(m => m.placement <= 4).length;
    const winCount = matches.filter(m => m.placement === 1).length;
    const avgPlacement = totalGames > 0 ? (matches.reduce((sum, m) => sum + m.placement, 0) / totalGames).toFixed(2) : 0;
    
    const profileIconUrl = account.profileIconId 
        ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`
        : 'https://via.placeholder.com/80';

    const tierImageUrl = league && league.tier 
        ? `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${league.tier.toLowerCase()}.png`
        : null;

    return (
        <div className="mb-8">
            <div style={styles.profileCard}>
                <img src={profileIconUrl} alt="profile icon" style={styles.profileIcon} onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }} />
                <div style={styles.profileInfo}>
                    <h2 style={styles.profileName}>{account.gameName}#{account.tagLine}</h2>
                    <p style={styles.profileRank}>
                        {league ? (
                            <>
                                {tierImageUrl && <img src={tierImageUrl} alt={league.tier} style={{ width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '5px' }} />}
                                {`${league.tier} ${league.rank} - ${league.leaguePoints} LP`}
                            </>
                        ) : 'Unranked'}
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


// --- MatchCard 및 하위 컴포넌트들 (SummonerPage.jsx 안에 직접 포함시킵니다.) ---

// 시너지 활성화 단계에 따른 배경색 HEX 코드
const getTraitHexColor = (style) => {
    switch (style) {
        case 1: return '#CD7F32'; // 브론즈 등급 (짙은 주황)
        case 2: return '#A0AEC0'; // 실버 등급 (회색 - 기존 실버 #C0C0C0 보다 진하게)
        case 3: return '#B89D29'; // 골드 등급 (기존 골드 #FFD700 보다 진하게)
        case 4: return '#4299E1'; // 프리즘 등급 (기존 프리즘 #B9F2FF 보다 진한 파랑)
        default: return '#718096'; // 기본값 (회색)
    }
};

// 챔피언 코스트에 따른 색상 정의
const getCostColors = (cost) => {
    switch (cost) {
        case 1: return '#808080'; // 그레이
        case 2: return '#1E823C'; // 그린
        case 3: return '#156293'; // 블루
        case 4: return '#87259E'; // 퍼플
        case 5: return '#B89D29'; // 골드
        default: return '#808080';
    }
};

const getCostBorderStyle = (cost) => ({
    border: `2px solid ${getCostColors(cost)}`
});

const getCostColor = (cost) => getCostColors(cost);


const Item = ({ item }) => (
    <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name} />
);

const Unit = ({ unit }) => { // getCostBorderStyle, getCostColor props는 styles 객체에서 참조 가능
    return (
        <div style={styles.unitWrapper}>
            {unit.tier > 0 && (
                <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}>
                    {'★'.repeat(unit.tier)}
                </div>
            )}
            <img
                src={unit.image_url}
                alt={unit.name}
                title={unit.name}
                style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }}
            />
            <div style={styles.unitItems}>
                {unit.items && unit.items.slice(0, 3).map((item, index) =>
                    item.image_url && <Item key={index} item={item} />
                )}
            </div>
            <span style={styles.unitName}>{unit.name}</span>
        </div>
    );
};

// PlayerCard 컴포넌트 (MatchCard 내부에서 사용)
const PlayerCard = ({ participant }) => { // getCostBorderStyle, getCostColor props는 Unit 컴포넌트에서 직접 사용
    const getPlacementColor = (placement) => {
        if (placement === 1) return '#FFD700'; // 1등 (골드)
        if (placement <= 4) return '#63B3ED'; // 2-4등 (파랑)
        return '#A0AEC0'; // 5-8등 (회색)
    };

    return (
        <div style={{
            backgroundColor: '#2D3748', border: '1px solid #4A5568', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center',
            borderLeft: `5px solid ${getPlacementColor(participant.placement)}`
        }}>
            <div style={{ flex: '0 0 120px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getPlacementColor(participant.placement) }}>#{participant.placement}</div>
                <div style={{ fontSize: '0.8rem', wordBreak: 'break-all', color: '#EAEAEA' }}>{participant.puuid.substring(0, 8)}...</div>
            </div>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {participant.traits.map((trait, index) => (
                        trait.image_url && (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#1A202C', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', color: '#EAEAEA' }}>
                                <img src={trait.image_url} alt={trait.name} style={{ width: '16px', height: '16px' }} title={trait.name} />
                                <span>{trait.tier_current}</span>
                            </div>
                        )
                    ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {participant.units.map((unit, index) => (
                        unit.image_url && <Unit key={index} unit={unit} />
                    ))}
                </div>
            </div>
        </div>
    );
};


// MatchCard 컴포넌트
function MatchCard({ match, userPuuid }) {
    const [isExpanded, setIsExpanded] = useState(false); // 상세보기 상태 관리
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' 또는 'ai-feedback'
    const [aiFeedback, setAiFeedback] = useState(null); // AI 피드백 데이터 상태
    const [aiLoading, setAiLoading] = useState(false); // AI 피드백 로딩 상태
    const [aiError, setAiError] = useState(null); // AI 피드백 에러 상태

    // match.info와 match.info.participants가 존재하는지 안전하게 확인
    const participants = match?.info?.participants; 

    // userParticipant를 찾을 때도 participants가 배열인지 확인
    const userParticipant = Array.isArray(participants) ? participants.find(p => p.puuid === userPuuid) : undefined;
    
    // 카드 왼쪽 테두리 색상 클래스 (Tailwind CSS와 함께 사용될 것으로 가정)
    const cardBorderColorClass = userParticipant ? (userParticipant.placement <= 4 ? 'border-l-green-500' : 'border-l-red-500') : 'border-l-gray-300';

    // 라운드 표기 개선 (예: 5-1)
    const formatRound = (round) => {
        if (typeof round !== 'number' || round < 1) return 'N/A';
        const stage = Math.floor((round - 1) / 6) + 2; // 스테이지 2부터 시작 (1라운드=2-1, 7라운드=3-1)
        const roundInStage = ((round - 1) % 6) + 1;
        return `${stage}-${roundInStage}`;
    };

    // AI 분석 탭이 활성화될 때 AI API 호출
    useEffect(() => {
        if (isExpanded && activeTab === 'ai-feedback' && match.matchId && !aiFeedback && !aiLoading) {
            const fetchAiFeedback = async () => {
                setAiLoading(true);
                setAiError(null);
                try {
                    // 백엔드의 /api/ai 라우트 호출 (매치 ID 전달)
                    const response = await axios.get(`/api/ai/${match.matchId}`);
                    if (response.status === 200 && response.data) {
                        setAiFeedback(response.data);
                    } else {
                        setAiError('AI 피드백을 불러오는데 실패했습니다.');
                    }
                } catch (err) {
                    setAiError('AI 피드백 요청 중 오류가 발생했습니다: ' + (err.response?.data?.message || err.message));
                } finally {
                    setAiLoading(false);
                }
            };
            fetchAiFeedback();
        }
    }, [isExpanded, activeTab, match.matchId, aiFeedback, aiLoading]); // 의존성 배열에 matchId, aiFeedback, aiLoading 추가

    return (
        <div style={styles.matchCard}> {/* 스타일 적용 */}
            <div style={{ ...styles.matchCardHeader, borderLeftColor: userParticipant ? (userParticipant.placement <= 4 ? '#10B981' : '#EF4444') : '#D1D5DB' }}> {/* Tailwind class to inline style */}
                {/* 등수 및 시간 정보 */}
                <div className="flex-none w-24 text-center">
                    {/* 등수 표기 */}
                    <p className={`font-bold text-lg ${userParticipant ? (userParticipant.placement === 1 ? 'text-yellow-500' : userParticipant.placement <= 4 ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}`}>
                        {userParticipant ? `${userParticipant.placement}등` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(match.game_datetime).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">라운드: {formatRound(match.last_round)}</p>
                </div>

                {/* 특성 및 유닛 정보 */}
                <div className="flex-1 px-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {match.traits
                            .filter(t => t.style > 0)
                            .sort((a, b) => b.tier_current - a.tier_current)
                            .map((trait, index) => (
                            trait.image_url && (
                                <div
                                    key={index}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold`}
                                    style={{ backgroundColor: getTraitHexColor(trait.style), color: 'white' }} // 시너지 박스에 색상 부여, 아이콘 및 글자 흰색
                                    title={`${trait.name} (${trait.tier_current}단계)`}
                                >
                                    <img
                                        src={trait.image_url}
                                        alt={trait.name}
                                        className="w-4 h-4"
                                        onError={(e) => {
                                            const baseIconName = trait.apiName.toLowerCase().replace('set11_', '').replace('.tex', '').replace('.png', '');
                                            e.target.src = `https://raw.communitydragon.org/latest/game/assets/traits/icon_tft11_${baseIconName}.png`;
                                            e.target.onerror = null;
                                        }}
                                    />
                                    <span>{trait.tier_current}</span>
                                </div>
                            )
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {match.units.map((unit, index) => (
                            unit.image_url && <Unit key={index} unit={unit} />
                        ))}
                    </div>
                </div>
                
                {/* 상세보기 버튼 (오른쪽 상단 박스 형태) */}
                <div style={styles.detailToggleBox} onClick={() => setIsExpanded(!isExpanded)}>
                    <span style={styles.detailToggleArrow}>{isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    {/* 탭 네비게이션 */}
                    <div className="flex border-b border-gray-300 mb-4">
                        <button 
                            className={`py-2 px-4 text-sm font-medium ${activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                            onClick={() => setActiveTab('summary')}
                        >
                            종합 정보
                        </button>
                        <button 
                            className={`py-2 px-4 text-sm font-medium ${activeTab === 'ai-feedback' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
                            onClick={() => setActiveTab('ai-feedback')}
                        >
                            AI 분석
                        </button>
                    </div>

                    {/* 탭 내용 */}
                    {activeTab === 'summary' && (
                        <div>
                            {/* 매치 상세 정보: 게임 길이, 게임 버전, 세트 정보 등 */}
                            <h4 className="font-semibold mb-2 text-lg">매치 요약 정보</h4> {/* 제목 변경 */}
                            <div className="bg-gray-100 p-4 rounded text-sm text-gray-800 mb-4">
                                <p><strong>게임 길이:</strong> {match.info?.game_length ? `${Math.floor(match.info.game_length / 60)}분 ${Math.round(match.info.game_length % 60)}초` : 'N/A'}</p>
                                <p><strong>게임 버전:</strong> {match.info?.game_version ? match.info.game_version.split('.').slice(0, 2).join('.') : 'N/A'}</p>
                                <p><strong>TFT 세트:</strong> {match.info?.tft_set_number ? `Set ${match.info.tft_set_number}` : 'N/A'}</p>
                                {/* 추가 정보 표시 가능 */}
                            </div>

                            <h4 className="font-semibold mb-2 text-lg">모든 플레이어 정보</h4> {/* 모든 플레이어 정보 제목 추가 */}
                            <div className="space-y-2">
                                {/* participants가 배열일 때만 map 호출 */}
                                {Array.isArray(participants) && participants.map(p => (
                                    <PlayerCard key={p.puuid} participant={p} />
                                ))}
                            </div>
                            {/* 매치 상세 페이지로 이동 링크는 종합정보 탭에서 완전히 제거 */}
                        </div>
                    )}

                    {activeTab === 'ai-feedback' && (
                        <div>
                            <h4 className="font-semibold mb-2 text-lg">AI 피드백</h4>
                            {aiLoading ? (
                                <p className="text-gray-600">AI 피드백을 불러오는 중입니다...</p>
                            ) : aiError ? (
                                <p className="text-red-500">{aiError}</p>
                            ) : aiFeedback ? (
                                <div className="bg-gray-100 p-4 rounded text-sm text-gray-800">
                                    {/* AI 피드백 데이터 구조에 따라 이 부분을 파싱하여 표시해야 합니다. */}
                                    {/* 현재 /api/ai/matchId 엔드포인트가 어떤 데이터를 반환하는지 알아야 정확한 표시 가능 */}
                                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {typeof aiFeedback === 'string' ? aiFeedback : JSON.stringify(aiFeedback, null, 2)}
                                    </pre>
                                    <p className="mt-4 text-gray-600">
                                        이 AI 피드백은 백엔드의 `/api/ai` 엔드포인트에서 가져온 것입니다.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-gray-600">AI 피드백이 없습니다. (API 응답 없음)</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


// --- SummonerPage 메인 컴포넌트 ---
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
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    setError(`에러: ${err.response.data.message}`);
                } else if (err.message) {
                    setError(`에러: ${err.message}`);
                } else {
                    setError('알 수 없는 에러가 발생했습니다.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSummonerData();
    }, [region, searchParams]);

    if (loading) return <div className="p-8 text-center text-text-secondary">전적을 불러오는 중입니다...</div>;
    if (error) return <div className="p-8 text-center text-error-red">{error}</div>;
    if (!data) return null; // data가 null이면 아무것도 렌더링하지 않음

    // data.matches가 undefined 또는 null일 경우 빈 배열로 처리하여 오류 방지
    const allMatches = data.matches || []; 
    
    // 백엔드에서 받은 매치 데이터 중 랭크 게임만 필터링합니다.
    const rankedMatches = allMatches.filter(match => {
        if (!match || typeof match.queue_id === 'undefined') {
            console.warn("WARN: Match or queue_id is undefined/null in filter. Skipping this match.", match);
            return false; 
        }
        return match.queue_id === 1100 || match.queue_id === 1090;
    });

    return (
        <div className="pt-8">
            {/* 프로필 카드에는 랭크 게임만 전달하여 통계 계산 */}
            <ProfileCard account={data.account} league={data.league} matches={rankedMatches} />

            <section>
                {/* 랭크 게임이 존재하는지 확인하고, 랭크 게임만 필터링하여 표시 */}
                {rankedMatches && rankedMatches.length > 0 ? ( 
                    <div className="space-y-3">
                        {/* MatchCard 컴포넌트에 필터링된 랭크 매치만 전달 */}
                        {rankedMatches.map((match) => (
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

// 이 파일의 맨 끝에 'export default SummonerPage;'만 있어야 합니다.
export default SummonerPage;