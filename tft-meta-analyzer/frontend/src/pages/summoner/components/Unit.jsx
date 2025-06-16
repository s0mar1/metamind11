// frontend/src/pages/summoner/components/Unit.jsx

import React from 'react';
import Item from './Item';
import { useTFTData } from '../../../context/TFTDataContext'; // ⬅️ 1. Context 훅 임포트

const styles = {
  unit : { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, gap: 2, cursor: 'pointer' }, // cursor 추가
  unitImage : { width: 42, height: 42, borderRadius: '4px' },
  starsContainer: { display: 'flex', fontSize: '0.8rem', textShadow: '0 0 2px #fff', height: 12 },
  itemsContainer: { display: 'flex', justifyContent: 'center', gap: 2, height: 14, marginTop: 1 },
};

const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
const getCostBorderStyle = c => ({ border: `2px solid ${costColors[c] || costColors[1]}` });
const getCostColor       = c => costColors[c] || costColors[1];

const Unit = ({ unit }) => {
  // ⬅️ 2. Context에서 필요한 데이터와 함수들을 가져옵니다.
  const { champions, showTooltip, hideTooltip } = useTFTData();

  // unit 객체에 있는 character_id를 사용해 전체 챔피언 데이터에서 상세 정보를 찾습니다.
  // (이 로직이 제대로 동작하려면 백엔드에서 unit 객체에 character_id를 포함시켜 보내줘야 합니다.)
  const championDetails = champions.find(c => c.apiName === unit.character_id);

  const handleMouseEnter = (e) => {
    // 챔피언 상세 정보가 있을 경우에만 툴팁을 보여줍니다.
    if (championDetails) {
      showTooltip(championDetails, e);
    }
  };

  return (
    // ⬅️ 3. 최상위 div에 마우스 이벤트를 연결합니다.
    <div
      style={styles.unit}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={hideTooltip}
    >
      <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}>{'★'.repeat(unit.tier)}</div>
      <img src={unit.image_url} alt={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }} />
      <div style={styles.itemsContainer}>{unit.items.map((it, idx) => it.image_url && <Item key={idx} item={it} />)}</div>
    </div>
  );
};

export default Unit;