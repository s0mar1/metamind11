// frontend/src/pages/summoner/components/MatchDetailContent.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Trait from './Trait';
import Unit from './Unit';

const styles = {
  // 상세 보기에 필요한 최소한의 스타일
  loading  : { padding: '2rem', textAlign: 'center', color: '#6E6E6E' },
  error    : { color: '#E74C3C', textAlign: 'center', padding: '2rem', background: '#FFFFFF', borderRadius: 8 },
  tabContainer : { display: 'flex', gap: '1rem', borderBottom: '1px solid #E6E6E6', marginBottom: '1rem' },
  tabButton    : { background: 'none', border: 'none', color: '#6E6E6E', padding: '0.5rem 1rem', cursor: 'pointer',
                   borderBottom: '2px solid transparent', fontWeight: 'bold' },
  activeTab    : { color: '#3ED2B9', borderBottom: '2px solid #3ED2B9' },
  aiAnalysisButton: { cursor: 'pointer', background: '#3ED2B9', color: '#fff', padding: '10px 15px',
                    borderRadius: 4, border: 'none', fontSize: '1rem', fontWeight: 'bold' },
  detailPlayerCard: { display: 'flex', alignItems: 'center', gap: '1rem', background: '#F9FAFB',
                      padding: '0.75rem', borderBottom: '1px solid #E5E7EB' },
  detailPlayerInfo: { flex: '0 0 90px', textAlign: 'center' },
  detailPlayerName: { fontWeight: 600, fontSize: '0.8rem', color: '#4B5563', wordBreak: 'break-all' },
  detailPlayerTraits: { display: 'flex', flexWrap: 'wrap', gap: '4px', width: '150px', flexShrink: 0 },
  detailPlayerUnits: { display: 'flex', alignItems: 'center', gap: '4px', flex: 1, flexWrap: 'wrap' },
  placement : { fontSize: '1.1rem', fontWeight: 'bold' },
};

const getPlacementColor = p => (p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280');

const AIAnalysisView = ({ matchId, userPuuid }) => {
    // ... AIAnalysisView 로직 (기존과 동일)
    return <div>AI 분석 기능은 여기에 구현됩니다.</div>;
};

const MatchDetailContent = ({ matchId, userPuuid, isCompact = false }) => { // isCompact prop을 받도록 추가
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await axios.get(`/api/match/${matchId}`);
        if (r.status !== 200) throw new Error(r.data.error);
        setDetail(r.data);
      } catch (e) { setError(e.response?.data?.error || e.message); }
      finally { setLoading(false); }
    };
    fetchDetail();
  }, [matchId]);

  const PlayerCard = ({ participant }) => {
    const acct = detail?.info?.accounts?.[participant.puuid];
    const traits = participant.traits || [];
    return (
      <div style={styles.detailPlayerCard}>
        <div style={styles.detailPlayerInfo}>
          <div style={{ ...styles.placement, color: getPlacementColor(participant.placement) }}>#{participant.placement}</div>
          <div style={styles.detailPlayerName}>{acct?.gameName || 'Unknown'}</div>
        </div>
        <div style={styles.detailPlayerTraits}>
          {traits.map((t, i) => <Trait key={i} trait={t} showCount={false} />)}
        </div>
        <div style={styles.detailPlayerUnits}>
          {/* 💡 수정: 상세 뷰에서는 isCompact: true로 Unit 컴포넌트에 전달 */}
          {participant.units.map((u, idx) => u.image_url && <Unit key={idx} unit={u} isCompact={true} />)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.tabContainer}>
        <button style={tab === 'info' ? { ...styles.tabButton, ...styles.activeTab } : styles.tabButton} onClick={() => setTab('info')}>종합 정보</button>
        <button style={tab === 'ai' ? { ...styles.tabButton, ...styles.activeTab } : styles.tabButton} onClick={() => setTab('ai')}>AI 분석</button>
      </div>
      {tab === 'info' && (
        loading ? <div style={styles.loading}>상세 정보 로딩 중...</div>
        : error ? <div style={styles.error}>{error}</div>
        : (<div>{detail?.info?.participants.sort((a, b) => a.placement - b.placement).map(p => <PlayerCard key={p.puuid} participant={p} />)}</div>)
      )}
      {tab === 'ai' && (<AIAnalysisView matchId={matchId} userPuuid={userPuuid} />)}
    </div>
  );
};

export default MatchDetailContent;