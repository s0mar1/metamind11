// frontend/src/pages/summoner/components/Trait.jsx

import React from 'react';
import classNames from 'classnames';
import TraitHexIcon from './TraitHexIcon';

const Trait = ({ trait, showCount = true }) => {
  const hexVariant = trait.style === 'unique' ? 'chromatic' : (trait.style === 'inactive' ? 'none' : trait.style);

  // 특성 아이콘 컨테이너 크기 (TraitHexIcon의 size prop과 일치)
  const traitIconSize = 32; // main.css의 trait-hexagon 기본 width와 일치

  // countBoxClassNames는 이제 사용되지 않으므로, 주석 처리합니다.
  // const countBoxClassNames = classNames(
  //   'trait-count-box',
  //   {
  //     [`trait-count-box--${trait.style}`]: trait.style && trait.style !== 'inactive',
  //     'trait-hexagon--inactive': trait.style === 'inactive', // 오타 수정
  //   }
  // );

  return (
    <div className="trait-group" title={`${trait.name} (${trait.tier_current})`}>
      {/* 💡 수정: 육각형 배경을 TraitHexIcon 컴포넌트로 대체 */}
      {/* size prop을 통해 TraitHexIcon의 크기를 제어 */}
      <div style={{ 
          position: 'relative', 
          width: traitIconSize, 
          height: traitIconSize * (115 / 100), // TraitHexIcon의 viewBox 종횡비에 맞춰 높이 설정
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
      }}>
          <TraitHexIcon variant={hexVariant} size={traitIconSize} /> {/* size prop 전달 */}
          {/* 실제 특성 아이콘 이미지를 SVG 위에 겹쳐서 표시 */}
          {/* 이미지 크기를 육각형 내부에 맞게 조절하고, 중앙에 위치 */}
          <img 
            src={trait.image_url} 
            alt={trait.name} 
            className="trait-img" 
            style={{ 
              position: 'absolute', 
              zIndex: 3, 
              width: 20, 
              height: 20 
            }} // 아이콘 이미지 크기 고정
          />
      </div>

      {/* 💡 수정: 특성 활성화 숫자 표시 부분을 제거합니다. */}
      {/* {showCount && trait.tier_current > 0 && (
        <div className={countBoxClassNames}>
          {trait.tier_current}
        </div>
      )} */}
    </div>
  );
};

export default Trait;