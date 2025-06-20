// frontend/src/pages/summoner/components/Unit.jsx

import React from 'react';
import Item from './Item';
import { useTFTData } from '../../../context/TFTDataContext';
import classNames from 'classnames';

const styles = {
  // 💡 수정: unit의 paddingTop을 다시 조정하여 별을 위한 상단 공간 명확히 확보
  unit : {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      cursor: 'pointer',
      position: 'relative', // 별과 아이템 absolute 포지셔닝을 위한 부모
      // 💡 수정: 별 (높이 12px) + 위아래 여백 (예: 4px + 4px = 8px) => paddingTop: 20px
      paddingTop: 13, // 챔피언 아이콘 위에 별이 겹치지 않고 별도 공간에 위치하도록 넉넉한 공간 확보
  },

  // 💡 수정: starsContainer의 위치와 정렬 재조정
  starsContainer: {
      display: 'flex',
      fontSize: '0.8rem',
      textShadow: '0 0 2px #fff',
      height: 12, // 별 자체의 높이 (고정)
      position: 'absolute', // unit 컨테이너 기준으로 위치
      top: 0, // unit 컨테이너의 맨 위 (padding-top 시작점)
      left: 0,
      right: 0, // left, right 0으로 설정하여 starsContainer가 unit의 width를 꽉 채우도록
      zIndex: 10, // 챔피언 이미지 위에 표시

      // 별들을 이 공간 내에서 중앙에 정렬
      justifyContent: 'center', // 수평 중앙 정렬
      alignItems: 'center', // 💡 수정: 수직 중앙 정렬 (top:0, height:12 이므로, 이 12px 공간에서 별을 수직 중앙)

      // backgroundColor: 'rgba(0,0,0,0.4)', // 제거됨
      // padding: '0 2px', // 별 좌우 여백은 이제 justify-content: center로 대체되거나 추가 여백으로 사용
      borderRadius: '0 0 4px 4px', // 하단만 둥글게
      // transform: 'translateX(-50%)', // left:50%와 함께 사용되나, left:0, right:0, justify-content:center로 대체 가능.
  },

  itemsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: 2,
      height: 12,
      marginTop: 2,
  },
};

const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
const getCostColor     = c => costColors[c] || costColors[1];
const getCostBorderStyle = c => ({ border: `2px solid ${getCostColor(c)}` });

const Unit = ({ unit, isCompact = false }) => {
  const { champions, showTooltip, hideTooltip } = useTFTData();

  const championDetails = champions.find(c => c.apiName === unit.character_id);

  const handleMouseEnter = (e) => {
    if (championDetails) {
      showTooltip(championDetails, e);
    }
  };

  const imgClassNames = classNames(
    "rounded-md object-cover",
    {
      "w-12 h-12": !isCompact, // 기본 크기 (48x48px)
      "w-10 h-10": isCompact     // 컴팩트 크기 (40x40px)
    }
  );

  const finalUnitWidth = isCompact ? 40 : 48;

  return (
    <div
      style={{
        ...styles.unit,
        width: finalUnitWidth
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={hideTooltip}
    >
      {/* 챔피언 별 (등급) 표시 - Unit의 paddingTop 공간 내에 위치 */}
      <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}>{'★'.repeat(unit.tier)}</div>

      {/* 챔피언 아이콘 이미지 - 별 영역 아래에 위치 */}
      <img
        src={unit.image_url}
        alt={unit.name}
        style={getCostBorderStyle(unit.cost)}
        className={imgClassNames}
        title={unit.name}
      />

      {/* 아이템 슬롯 */}
      <div style={styles.itemsContainer}>
        {unit.items.map((it, idx) => it.image_url &&
          <Item key={idx} item={it} isCompact={isCompact} />
        )}
      </div>
    </div>
  );
};

export default Unit;