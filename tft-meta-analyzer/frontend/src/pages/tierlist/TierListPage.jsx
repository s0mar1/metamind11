// frontend/src/pages/tierlist/TierListPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 

function TierListPage() {
  const [deckTiers, setDeckTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 스타일 객체들 --- (이전과 동일)
  const containerStyle = {
    padding: '2rem',
    backgroundColor: '#1E252E', 
    borderRadius: '8px',
    marginTop: '2rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
    color: '#E0E0E0',
  };

  const titleStyle = {
    fontSize: '2.5rem',
    color: '#63B3ED', 
    marginBottom: '2rem',
    textAlign: 'center',
    fontWeight: 'bold',
  };

  const loadingErrorStyle = {
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#B0B0B0',
    padding: '3rem',
  };

  const tierSectionStyle = {
    marginBottom: '3.5rem',
    paddingBottom: '2.5rem',
    borderBottom: '1px solid #3A4452', 
  };

  const tierTitleStyle = (tier) => {
    let color;
    switch (tier) {
      case 'S': color = '#FF6363'; break; 
      case 'A': color = '#FFB000'; break; 
      case 'B': color = '#E0D000'; break; 
      case 'C': color = '#4CAF50'; break; 
      case 'D': color = '#9E9E9E'; break; 
      default: color = '#B0B0B0'; // 'Unknown' 또는 데이터 없는 티어
    }
    return {
      fontSize: '2.8rem', 
      fontWeight: 'bold',
      color: color,
      textAlign: 'left', 
      marginBottom: '1.5rem',
      paddingLeft: '1rem',
      textShadow: `0 0 10px ${color}40`, 
      borderLeft: `8px solid ${color}`, 
      borderRadius: '4px',
    };
  };

  const tierListStyle = {
    listStyle: 'none',
    padding: 0,
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
    gap: '1.5rem', 
  };

  const tierItemStyle = {
    backgroundColor: '#2A303A', 
    padding: '1.5rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    border: '1px solid #3A4452', 
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    // styled-components 등을 사용하지 않으면 직접 적용 불가
    // '&:hover': { 
    //   transform: 'translateY(-5px)',
    //   boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
    // },
  };

  const deckTitleContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  };

  const deckTitleTextStyle = {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    color: '#FFD700', 
  };

  const championIconStyle = {
    width: '48px', 
    height: '48px',
    borderRadius: '8px', 
    border: '2px solid #FFD700', 
    objectFit: 'cover',
  };

  const statsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    color: '#B0B0B0',
    marginBottom: '0.5rem',
  };

  const statItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.3rem 0.5rem',
    backgroundColor: '#3A4452',
    borderRadius: '4px',
  };

  const statLabelStyle = {
    fontSize: '0.75rem',
    color: '#888888',
  };
  const statValueStyle = {
    fontWeight: 'bold',
    color: '#E0E0E0',
  };

  const traitListStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginTop: '0.5rem',
  };

  const traitBadgeStyle = {
    backgroundColor: '#3A4452',
    color: '#E0E0E0',
    padding: '0.4rem 0.7rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    border: '1px solid #5A6472',
  };

  const traitIconStyle = {
    width: '24px', 
    height: '24px',
    verticalAlign: 'middle',
    borderRadius: '4px',
  };

  // 챔피언 한글 이름 -> API 이름 매핑 (중복 제거)
  const championApiNameMap = {
    "나피리": "naafiri", "나미": "nami", "나서스": "nasus", "닐라": "nilah", "녹턴": "nocturne",
    "누누와윌럼프": "nunu", "다리우스": "darius", "다이애나": "diana", "드레이븐": "draven",
    "람머스": "rammus", "럭스": "lux", "럼블": "rumble", "레나타글라스크": "renataglasc",
    "렉사이": "reksai", "레오나": "leona", "레넥톤": "renekton", "릴리아": "lillia",
    "리신": "leesin", "리븐": "riven", "말자하": "malzahar", "말파이트": "malphite",
    "모데카이저": "mordekaiser", "모르가나": "morgana", "문도박사": "drmundo", 
    "미스포츈": "missfortune", "바루스": "varus", "바이": "vi", "베이가": "veigar",
    "베인": "vayne", "벨베스": "belveth", "브라움": "braum", "브랜드": "brand",
    "블라디미르": "vladimir", "블리츠크랭크": "blitzcrank", "사미라": "samira", "샤코": "shaco",
    "세나": "senna", "세라핀": "seraphine", "세트": "sett", "소나": "sona",
    "쉔": "shen", "쉬바나": "shyvana", 
    "스웨인": "swain", "시비르": "sivir",
    "신드라": "syndra", "신지드": "singed", "쓰레쉬": "thresh", "아리": "ahri",
    "아우렐리온솔": "aurelionsol", "아이번": "ivern", "아트록스": "aatrox", "아펠리오스": "aphelios",
    "애니": "annie", "애쉬": "ashe", "야스오": "yasuo", "요네": "yone",
    "요릭": "yorick", "우디르": "udyr", "우르곳": "urgot", "유미": "yuumi",
    "이렐리아": "irelia", "이즈리얼": "ezreal", "자르반4세": "jarvaniv", "자야": "xayah",
    "자이라": "zyra", "자크": "zac", "잔나": "janna", "잭스": "jax",
    "제드": "zed", "제리": "zhao", "제이스": "jayce", "조이": "zoe",
    "진": "jhin", "징크스": "jinx", "초가스": "chogath", "카밀": "camille",
    "카이사": "kaisa", "카타리나": "katarina", "카직스": "khazix", "케인": "kayn",
    "코그모": "kogmaw", "퀸": "quinn", "타릭": "taric", "탈론": "talon",
    "탈리야": "taliyah", "트리스타나": "tristana", "트위스티드페이트": "twistedfate", "트위치": "twitch",
    "티모": "teemo", "파이크": "pyke", "피오라": "fiora", "하이머딩거": "heimerdinger",
    "헤카림": "hecarim", "갈리오": "galio", "그레이브즈": "graves", "르블랑": "leblanc",
    "오른": "orn", "일라오이": "illaoi", 
    "코부코": "kobuko", 
    "아우로라": "aurora", 
    "엘리스": "elise",
    "케이틀린": "caitlyn", 
    "키아나": "qiyana", 
    "킨드레드": "kindred", 
    "세주아니": "sejuani", 
    "룰루": "lulu", 
    "루시안": "lucian", 
    "노틸러스": "nautilus", 
    "오리아나": "orianna", 
    "라칸": "rakan", 
    "사이온": "sion", 
    "볼리베어": "volibear", 
    "아무무": "amumu", 
    "가렌": "garen", 
    "나르": "gnar", 
    "갱플랭크": "gangplank", 
    "카사딘": "kassadin", 
    "케일": "kayle", 
    "케넨": "kennen", 
    "클레드": "kled", 
    "마오카이": "maokai", 
    "마스터 이": "masteryi", 
  };

  // 챔피언 이미지 URL을 동적으로 생성하는 함수 (정확도 개선)
  const getChampionImageUrl = (championName) => {
    if (!championName || championName === 'Unknown') return null;
    const apiName = championApiNameMap[championName] || championName.toLowerCase().replace(/ /g, '').replace(/'/g, ''); 
    
    // TFT 챔피언 아이콘 경로 (정확도 높은 CommunityDragon 사용)
    // 예: https://raw.communitydragon.org/latest/game/assets/characters/tft14_ahri/hud/tft14_ahri_square.tft_set14.png
    return `https://raw.communitydragon.org/latest/game/assets/characters/tft14_${apiName}/hud/tft14_${apiName}_square.tft_set14.png`;
  };


  useEffect(() => {
    const fetchDeckTiers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:4000/api/deck-tiers'); 
        
        const sortedDecks = response.data.sort((a, b) => {
          const tierOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'Unknown': 5 };
          const tierDiff = tierOrder[a.tierRank || 'Unknown'] - tierOrder[b.tierRank || 'Unknown'];
          if (tierDiff !== 0) return tierDiff;
          return b.totalGames - a.totalGames; 
        });
        setDeckTiers(sortedDecks);
        setError(null);
      } catch (err) {
        console.error('덱 티어 정보 불러오기 실패:', err); 
        setError('덱 티어 정보를 불러오는 데 실패했습니다. 서버를 확인해 주세요.');
      } finally {
        setLoading(false);
      }
    };
    fetchDeckTiers();
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingErrorStyle}>덱 티어 정보를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={loadingErrorStyle}>{error}</div>
      </div>
    );
  }

  const groupedDecks = deckTiers.reduce((acc, deck) => {
    const tier = deck.tierRank || 'Unknown'; 
    if (!acc[tier]) {
      acc[tier] = [];
    }
    acc[tier].push(deck);
    return acc;
  }, {});

  const tierOrder = ['S', 'A', 'B', 'C', 'D', 'Unknown']; 

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>실시간 덱 티어리스트</h2>
      {Object.keys(groupedDecks).length === 0 ? (
        <div style={loadingErrorStyle}>
          아직 분석된 덱 티어 정보가 없습니다.<br />
          데이터 수집 (5분마다 갱신) 및 분석 (매시 정각)을 기다려주세요.<br />
          (백엔드 콘솔을 확인하여 데이터가 쌓이고 있는지 확인할 수 있습니다.)
        </div>
      ) : (
        <>
          {tierOrder.map(tier => groupedDecks[tier] && groupedDecks[tier].length > 0 && (
            <div key={tier} style={tierSectionStyle}>
              <h3 style={tierTitleStyle(tier)}>{tier} Tier</h3>
              <ul style={tierListStyle}>
                {groupedDecks[tier].map((deck, index) => (
                  <li key={deck.deckKey} style={tierItemStyle}>
                    <div style={deckTitleContainerStyle}>
                      {/* 캐리 챔피언 아이콘 표시 */}
                      {deck.carryChampionName && deck.carryChampionName !== 'Unknown' && (
                        <img 
                          src={getChampionImageUrl(deck.carryChampionName)} 
                          alt={deck.carryChampionName} 
                          style={championIconStyle} 
                          onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/48"; }} // 이미지 에러 시 대체 이미지
                        />
                      )}
                      <span style={deckTitleTextStyle}>
                        {deck.carryChampionName !== 'Unknown' ? `${deck.carryChampionName} 캐리 ` : ''}
                        {deck.deckKey.split('_')[0]} ({deck.deckKey.split('_')[1]}) 덱
                      </span>
                    </div>
                    
                    <div style={statsContainerStyle}>
                      <div style={statItemStyle}>
                        <span style={statValueStyle}>{deck.averagePlacement.toFixed(2)}위</span>
                        <span style={statLabelStyle}>평균 등수</span>
                      </div>
                      <div style={statItemStyle}>
                        <span style={statValueStyle}>{(deck.top4Count / deck.totalGames * 100).toFixed(1)}%</span>
                        <span style={statLabelStyle}>탑 4 확률</span>
                      </div>
                      <div style={statItemStyle}>
                        <span style={statValueStyle}>{(deck.winCount / deck.totalGames * 100).toFixed(1)}%</span>
                        <span style={statLabelStyle}>1등 확률</span>
                      </div>
                      <div style={statItemStyle}>
                        <span style={statValueStyle}>{deck.totalGames}</span>
                        <span style={statLabelStyle}>게임 분석</span>
                      </div>
                    </div>

                    <div style={traitListStyle}>
                      {deck.traits.map((trait, traitIndex) => (
                        <span key={traitIndex} style={traitBadgeStyle}>
                          {/* trait.image_url이 백엔드에서 제공된다면 사용 */}
                          {trait.image_url && <img src={trait.image_url} alt={trait.name} style={traitIconStyle} />}
                          {trait.name} ({trait.tier_current})
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default TierListPage;