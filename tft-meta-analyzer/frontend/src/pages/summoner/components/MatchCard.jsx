// frontend/src/pages/summoner/components/MatchCard.jsx

import React, { useState, useEffect } from 'react';
import Trait from './Trait';
import Unit from './Unit';
import MatchDetailContent from './MatchDetailContent';
import axios from 'axios';
import classNames from 'classnames';

const styles = {
  // 💡 수정: matchCardWrapper에 position: relative와 overflow: hidden 추가 (가장 중요)
  matchCardWrapper: { 
      background: '#FFFFFF', 
      borderLeft: '5px solid',
      borderRadius: 8, 
      padding: '1rem', 
      marginBottom: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      position: 'relative', // 💡 추가: 이 래퍼를 기준으로 absolute 자식들이 제한됨
      overflow: 'hidden',   // 💡 추가: 이 래퍼 밖으로 내용이 튀어나가지 못하게 함
  },
  matchCard : { display: 'flex', gap: '1rem', alignItems: 'center' },
  matchInfo : { flexShrink: 0, width: '70px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', gap: 2 },
  placement : { fontSize: '1.1rem', fontWeight: 'bold' },
  level     : { fontSize: '0.75rem',  color: '#6E6E6E' },
  date      : { fontSize: '0.7rem', color: '#A0AEC0' },
  matchDetails      : { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  matchDetailsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  traitsContainer : { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  unitsContainer: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '6px', 
    // 💡 수정: unitsContainer의 overflow: hidden은 이미 matchCardWrapper가 있으므로 여기서는 제거 가능 (또는 유지)
    // position: 'relative', // 이것도 matchCardWrapper가 처리하므로 제거 가능
  }, 
  detailButton      : { cursor: 'pointer', background: 'transparent', color: '#6E6E6E',
                        fontSize: '1.5rem', border: 'none', padding: '0.5rem',
                        transition: 'transform .2s' },
  detailViewContainer: { borderTop: '1px solid #E6E6E6', paddingTop: '1rem', marginTop: '1rem' },

  aiAnalysisContainer: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E6E6E6',
    backgroundColor: '#F9FAFB',
    borderRadius: '4px',
    padding: '15px',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    fontFamily: 'Nanum Gothic, sans-serif',
  },
  aiAnalysisTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '10px',
  },
  aiAnalysisLoading: {
    textAlign: 'center',
    color: '#6E6E6E',
    padding: '15px 0',
  },
  aiAnalysisError: {
    textAlign: 'center',
    color: '#E74C3C',
    padding: '15px 0',
  }
};

const getPlacementColor = p => (p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280');

const MatchCard = ({ match, onToggle, isExpanded }) => {
  const traits = match.traits || [];
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    if (isExpanded && !aiAnalysis && !aiLoading && !aiError) {
      const fetchAiAnalysis = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
          const response = await axios.post('/api/ai/analyze', {
            matchId: match.matchId,
            userPuuid: match.puuid,
          });
          setAiAnalysis(response.data.analysis);
        } catch (err) {
          console.error("AI 분석 로딩 오류:", err);
          setAiError(err.response?.data?.error || err.message || 'AI 분석을 불러오는데 실패했습니다.');
        } finally {
          setAiLoading(false);
        }
      };
      fetchAiAnalysis();
    }
  }, [isExpanded, match.matchId, match.puuid, aiAnalysis, aiLoading, aiError]);

  return (
    <div style={{ ...styles.matchCardWrapper, borderLeftColor: getPlacementColor(match.placement) }}>
      <div style={styles.matchCard}>
        <div style={styles.matchInfo}>
          <div style={{ ...styles.placement, color: getPlacementColor(match.placement) }}>#{match.placement}</div>
          <p style={styles.level}>레벨 {match.level}</p>
          <p style={styles.date}>{new Date(match.game_datetime).toLocaleDateString()}</p>
        </div>
        <div style={styles.matchDetails}>
          <div style={styles.matchDetailsHeader}>
            <div style={styles.traitsContainer}>
              {traits
                .filter(t => t && t.style !== 'inactive')
                .sort((a, b) => b.styleOrder - a.styleOrder)
                .map((trait) => (
                  trait ? <Trait key={trait.apiName} trait={trait} showCount={true} /> : null
                ))}
            </div>
            <button onClick={() => onToggle(match.matchId)} style={{ ...styles.detailButton, transform: isExpanded ? 'rotate(180deg)' : 'none' }} title={isExpanded ? '간략히' : '상세보기'}>▼</button>
          </div>
          <div style={styles.unitsContainer}>
            {match.units.map((u, idx) => u && u.image_url &&
              <Unit key={idx} unit={u} isCompact={false} />
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div style={styles.detailViewContainer}>
          <MatchDetailContent
            matchId={match.matchId}
            userPuuid={match.puuid}
            isCompact={true}
          />

          
        </div>
      )}
    </div>
  );
};

export default MatchCard;