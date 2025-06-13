import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  스타일 객체                                                        */
/* ------------------------------------------------------------------ */
const styles = {
  container: { paddingTop: '2rem', paddingBottom: '4rem' },
  error    : { color:'#E74C3C', textAlign:'center', padding:'2rem',
               background:'#FFFFFF', borderRadius:8 },
  loading  : { padding:'2rem', textAlign:'center', color:'#6E6E6E' },

  /* 프로필 영역 ---------------------------------------------------- */
  profileSection : { marginBottom:'2rem' },
  profileCard    : { display:'flex', alignItems:'center', gap:'24px',
                     background:'#fff', padding:'24px', borderRadius:8,
                     boxShadow:'0 4px 12px rgba(0,0,0,0.08)' },
  profileIcon    : { width:80, height:80, borderRadius:8,
                     background:'#E6E6E6' },
  profileInfo    : { flexGrow:1 },
  profileName    : { fontSize:'1.875rem', fontWeight:'bold', color:'#2E2E2E' },
  profileRank    : { fontSize:'1.125rem', color:'#6E6E6E', fontWeight:'600' },
  refreshButton  : { background:'#3ED2B9', color:'#fff', fontWeight:'bold',
                     padding:'8px 16px', borderRadius:6, border:'none',
                     cursor:'pointer', transition:'opacity .2s' },
  statsSummary   : { display:'grid', gridTemplateColumns:'repeat(4,1fr)',
                     gap:16, background:'#fff', padding:16, borderRadius:8,
                     boxShadow:'0 4px 12px rgba(0,0,0,0.08)', marginTop:'1rem' },
  statItem       : { textAlign:'center' },
  statValue      : { fontSize:'1.25rem', fontWeight:'bold', color:'#2E2E2E' },
  statLabel      : { fontSize:'0.875rem', color:'#6E6E6E' },

  /* 매치 카드 ------------------------------------------------------ */
  matchCardWrapper:{ background:'#FFFFFF', borderLeft:'5px solid',
                     borderRadius:8, padding:'1.5rem', marginBottom:'1rem',
                     boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
  matchCard :{ display:'flex', gap:'1.5rem', alignItems:'center' },
  matchInfo :{ flexShrink:0, width:90, textAlign:'center',
               display:'flex', flexDirection:'column', gap:2 },
  placement :{ fontSize:'1.25rem', fontWeight:'bold' },
  level     :{ fontSize:'0.8rem', color:'#6E6E6E' },
  date      :{ fontSize:'0.75rem', color:'#A0AEC0' },
  matchDetails     :{ flex:1, display:'flex', flexDirection:'column', gap:8 },
  matchDetailsHeader:{ display:'flex', justifyContent:'space-between',
                       alignItems:'center' },

  /* 특성 · 유닛 ---------------------------------------------------- */
  traitsContainer :{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' },
  traitIconWrapper:{ display:'flex', alignItems:'center', justifyContent:'center',
                     width:26, height:26, borderRadius:'50%', padding:2 },
  traitImg  :{ width:18, height:18, objectFit:'contain',
               filter:'brightness(0) invert(1)' },

  unitsContainer :{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 },
  unit      :{ display:'flex', flexDirection:'column', alignItems:'center',
               width:44, gap:2 },
  unitImage :{ width:40, height:40, borderRadius:4 },
  starsContainer:{ display:'flex', fontSize:'0.8rem',
                   textShadow:'0 0 2px #fff', height:12 },
  itemsContainer:{ display:'flex', justifyContent:'center', gap:1,
                   height:14, marginTop:1 },
  itemImage :{ width:14, height:14, borderRadius:2 },

  /* 상세 보기 ------------------------------------------------------ */
  detailButton :{ cursor:'pointer', background:'transparent', color:'#6E6E6E',
                  fontSize:'1.5rem', border:'none', padding:'0.5rem',
                  transition:'transform .2s' },
  detailViewContainer:{ borderTop:'1px solid #E6E6E6', paddingTop:'1rem',
                        marginTop:'1rem' },

  /* 탭 */
  tabContainer :{ display:'flex', gap:'1rem', borderBottom:'1px solid #E6E6E6',
                  marginBottom:'1rem' },
  tabButton    :{ background:'none', border:'none', color:'#6E6E6E',
                  padding:'0.5rem 1rem', cursor:'pointer',
                  borderBottom:'2px solid transparent', fontWeight:'bold' },
  activeTab    :{ color:'#3ED2B9', borderBottom:'2px solid #3ED2B9' },

  aiAnalysisButton:{ cursor:'pointer', background:'#3ED2B9', color:'#fff',
                     padding:'10px 15px', borderRadius:4, border:'none',
                     fontSize:'1rem', fontWeight:'bold' },
};

/* ------------------------------------------------------------------ */
/*  헬퍼                                                              */
/* ------------------------------------------------------------------ */
const getPlacementColor = p =>
  p === 1 ? '#F59E0B' : p <= 4 ? '#3B82F6' : '#6B7280';

const costColors = {1:'#6B7280',2:'#16A34A',3:'#3B82F6',4:'#9333EA',5:'#FBBF24'};
const getCostBorderStyle = c => ({ border:`2px solid ${costColors[c]||costColors[1]}` });
const getCostColor = c =>
  ({1:'#A0AEC0',2:'#4ADE80',3:'#60A5FA',4:'#C084FC',5:'#FBBF24'}[c] || '#A0AEC0');

/* ------------------------------------------------------------------ */
/*  재사용 컴포넌트                                                   */
/* ------------------------------------------------------------------ */
const Trait = ({ trait }) => {
  /* 색상: 백엔드 color → 없으면 회색 */
   const edge = trait.color || '#4B5563';
  const bg   = `${edge}26`;              // 15 % 투명 배경
  const border = `2px solid ${edge}`;

  const slug = trait.name.toLowerCase().replace(/\s+/g,'');
  const fallback = `https://raw.communitydragon.org/latest/game/assets/ux/traiticons/trait_icon_14_${slug}.png`;

  return (
    <div
      style={{ ...styles.traitIconWrapper, backgroundColor:bg, border }}
      title={`${trait.name} (${trait.tier_current})`}
    >
      <img
        src={trait.image_url || fallback}
        alt={trait.name}
        style={styles.traitImg}
        onError={e => (e.currentTarget.src = fallback)}
      />
      {/* ★ 필요하면 수치도 같이 표시
          <span>{trait.tier_current}</span> */}
    </div>
  );
};

const Item = ({ item }) => (
  <img
    src={item.image_url}
    alt={item.name}
    title={item.name}
    style={styles.itemImage}
    onError={e => (e.currentTarget.style.display='none')}
  />
);

const Unit = ({ unit }) => (
  <div style={styles.unit}>
    <div style={{ ...styles.starsContainer, color:getCostColor(unit.cost) }}>
      {'★'.repeat(unit.tier)}
    </div>
    <img
      src={unit.image_url}
      alt={unit.name}
      style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }}
    />
    <div style={styles.itemsContainer}>
      {unit.items.map((it,i)=> it.image_url && <Item key={i} item={it} />)}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  프로필 카드 · AI 분석 · 상세 카드 (코드는 이전과 동일)             */
/* ------------------------------------------------------------------ */
const ProfileCard = ({ account, league, matches, onRefresh, isRefreshing }) => {
  if (!account) return null;

  const totalGames = matches.length;
  const top4 = matches.filter(m => m.placement <= 4).length;
  const win  = matches.filter(m => m.placement === 1).length;
  const avg  = totalGames ? (matches.reduce((s,m)=>s+m.placement,0)/totalGames).toFixed(2) : 0;
  const icon = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profileIconId}.jpg`;

  return (
    <section style={styles.profileSection}>
      <div style={styles.profileCard}>
        <img src={icon} alt="" style={styles.profileIcon}
             onError={e => (e.currentTarget.src='https://via.placeholder.com/80')} />
        <div style={styles.profileInfo}>
          <h2 style={styles.profileName}>{account.gameName}#{account.tagLine}</h2>
          <p style={styles.profileRank}>
            {league ? `${league.tier} ${league.rank} · ${league.leaguePoints} LP`
                    : 'Unranked'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ ...styles.refreshButton, opacity:isRefreshing?0.5:1 }}
        >
          {isRefreshing ? '갱신 중...' : '전적 갱신'}
        </button>
      </div>

      {totalGames > 0 && (
        <div style={styles.statsSummary}>
          <div style={styles.statItem}>
            <p style={styles.statValue}>{avg}</p><p style={styles.statLabel}>평균 등수</p>
          </div>
          <div style={styles.statItem}>
            <p style={{...styles.statValue,color:'#3B82F6'}}>
              {((top4/totalGames)*100).toFixed(1)}%
            </p>
            <p style={styles.statLabel}>순방률</p>
          </div>
          <div style={styles.statItem}>
            <p style={{...styles.statValue,color:'#F59E0B'}}>
              {((win/totalGames)*100).toFixed(1)}%
            </p>
            <p style={styles.statLabel}>1등률</p>
          </div>
          <div style={styles.statItem}>
            <p style={styles.statValue}>{totalGames}</p><p style={styles.statLabel}>게임</p>
          </div>
        </div>
      )}
    </section>
  );
};

/* -- AIAnalysisView ------------------------------------------------- */
const AIAnalysisView = ({ matchId, userPuuid }) => {
  const [loading,setLoading] = useState(false);
  const [error,setError]   = useState(null);
  const [result,setResult] = useState('');

  const analyze = async () => {
    setLoading(true); setError(null); setResult('');
    try {
      const r = await fetch('/api/ai/analyze',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({matchId,userPuuid})
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error||'AI 분석 실패');
      setResult(data.analysis);
    } catch(e){ setError(e.message); }
    finally   { setLoading(false); }
  };

  const btnStyle = loading
    ? { ...styles.aiAnalysisButton, background:'#A0AEC0', cursor:'not-allowed' }
    : styles.aiAnalysisButton;

  return (
    <div style={{padding:'1rem', textAlign:'center'}}>
      {error && <p style={styles.error}>{error}</p>}
      {result && <pre style={{textAlign:'left',whiteSpace:'pre-wrap'}}>{result}</pre>}
      {!result && !error && (
        <button onClick={analyze} style={btnStyle} disabled={loading}>
          {loading ? 'AI가 분석 중...' : '이 게임 분석하기'}
        </button>
      )}
    </div>
  );
};

/* -- MatchDetailContent ------------------------------------------------ */
const MatchDetailContent = ({ matchId, userPuuid }) => {
  const [tab,setTab] = useState('info');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [detail,setDetail] = useState(null);

  useEffect(()=>{
    const fn = async()=>{
      setLoading(true);
      try{
        const r = await axios.get(`/api/match/${matchId}`);
        if (r.status!==200) throw new Error(r.data.error);
        setDetail(r.data);
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    };
    fn();
  },[matchId]);

  const PlayerCard = ({ participant }) => {
    const acct = detail?.info?.accounts?.[participant.puuid];
    return (
      <div style={{...styles.matchCard, marginBottom:'0.5rem',
                   background:'#F9F9F9', padding:'1rem'}}>
        <div style={{...styles.matchInfo, flex:'0 0 150px'}}>
          <div style={{ ...styles.placement,
                        color:getPlacementColor(participant.placement)}}>
            #{participant.placement}
          </div>
          <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>
            {acct?.gameName||'Unknown'}#{acct?.tagLine}
          </div>
        </div>
        <div style={styles.matchDetails}>
          <div style={styles.traitsContainer}>
            {participant.traits.map((t,i)=><Trait key={i} trait={t} />)}
          </div>
          <div style={styles.unitsContainer}>
            {participant.units.map((u,i)=>u.image_url&&<Unit key={i} unit={u}/> )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.tabContainer}>
        <button
          style={tab==='info'
            ? {...styles.tabButton,...styles.activeTab}
            : styles.tabButton}
          onClick={()=>setTab('info')}
        >
          종합 정보
        </button>
        <button
          style={tab==='ai'
            ? {...styles.tabButton,...styles.activeTab}
            : styles.tabButton}
          onClick={()=>setTab('ai')}
        >
          AI 분석
        </button>
      </div>

      {tab==='info' && (
        loading ? <div>상세 정보 로딩 중...</div>
        : error  ? <div style={styles.error}>{error}</div>
        : (
            <div>
              {detail?.info?.participants
                .map(p=><PlayerCard key={p.puuid} participant={p}/>)}
            </div>
          )
      )}

      {tab==='ai' && <AIAnalysisView matchId={matchId} userPuuid={userPuuid}/>}
    </div>
  );
};

/* -- MatchCard --------------------------------------------------------- */
const MatchCard = ({ match, userPuuid, onToggle, isExpanded }) => {
  const traitsSorted = [...(match.traits||[])]
    .sort((a,b)=>(b.styleOrder??0)-(a.styleOrder??0));

  return (
    <div
      style={{...styles.matchCardWrapper,
              borderLeftColor:getPlacementColor(match.placement)}}
    >
      <div style={styles.matchCard}>
        <div style={styles.matchInfo}>
          <div style={{...styles.placement,
                       color:getPlacementColor(match.placement)}}>
            #{match.placement}
          </div>
          <p style={styles.level}>레벨 {match.level}</p>
          <p style={styles.date}>
            {new Date(match.game_datetime).toLocaleDateString()}
          </p>
        </div>

        <div style={styles.matchDetails}>
          <div style={styles.matchDetailsHeader}>
            <div style={styles.traitsContainer}>
              {traitsSorted
                .filter(t=>t.style!=='inactive')
                .map((t,i)=><Trait key={i} trait={t} />)}
            </div>

            <button
              onClick={()=>onToggle(match.matchId)}
              style={{...styles.detailButton,
                      transform:isExpanded?'rotate(180deg)':'none'}}
              title={isExpanded?'간략히':'상세보기'}
            >
              ▼
            </button>
          </div>

          <div style={styles.unitsContainer}>
            {match.units.map((u,i)=>u.image_url&&<Unit key={i} unit={u} />)}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.detailViewContainer}>
          <MatchDetailContent matchId={match.matchId} userPuuid={userPuuid}/>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  메인 페이지                                                        */
/* ------------------------------------------------------------------ */
export default function SummonerPage() {
  const { region } = useParams();
  const [searchParams] = useSearchParams();

  const [loading,setLoading] = useState(true);
  const [error,setError]     = useState(null);
  const [data,setData]       = useState(null);
  const [expanded,setExpanded] = useState(null);

  /* 데이터 요청 */
  const fetchData = async (force=false)=>{
    setLoading(true);
    if (!force) setError(null);
    const gameName = searchParams.get('gameName');
    const tagLine  = searchParams.get('tagLine');
    if (!region||!gameName||!tagLine){
      setLoading(false);
      setError('URL 파라미터가 부족합니다.');
      return;
    }
    try{
      const qs = new URLSearchParams({region,gameName,tagLine,forceRefresh:force}).toString();
      const r  = await axios.get(`/api/summoner?${qs}`);
      if (r.status!==200) throw new Error(r.data.error||'API 오류');
      setData(r.data);
    }catch(e){ setError(e.response?.data?.error||e.message); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ setExpanded(null); fetchData(false); },
              [region,searchParams]);

  const toggle = id => setExpanded(prev=>prev===id?null:id);

  if (loading && !data) return <div style={styles.loading}>전적을 불러오는 중입니다...</div>;
  if (error   && !data) return <div style={styles.error}>에러: {error}</div>;
  if (!data)            return null;

  return (
    <div style={styles.container}>
      <ProfileCard
        account={data.account}
        league={data.league}
        matches={data.matches||[]}
        onRefresh={()=>fetchData(true)}
        isRefreshing={loading && !!data}
      />

      {error && !loading && <div style={styles.error}>에러: {error}</div>}

      {data.matches?.length ? (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {data.matches.map(m=>(
            <MatchCard
              key={m.matchId}
              match={m}
              userPuuid={data.account.puuid}
              onToggle={toggle}
              isExpanded={expanded===m.matchId}
            />
          ))}
        </div>
      ) : (
        !error && (
          <div style={{padding:'2rem', background:'#fff',
                       borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            최근 랭크 게임 전적이 없습니다.
          </div>
        )
      )}
    </div>
  );
}
