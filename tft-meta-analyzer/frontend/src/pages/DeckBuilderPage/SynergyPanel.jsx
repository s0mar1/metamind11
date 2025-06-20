// frontend/src/pages/DeckBuilderPage/SynergyPanel.jsx (긴급 수정: 백엔드 임포트 제거)

import React, { useState, useMemo } from 'react'; // useState 추가
import { useDrag } from 'react-dnd'; // 필요 없으면 제거
import { ItemTypes } from '../../constants'; // 필요 없으면 제거
import { useTFTData } from '../../context/TFTDataContext';
// import { getTraitStyleInfo } from '../../../backend/src/services/tftData'; // 이 라인을 제거하거나 주석 처리!

// 챔피언 코스트별 테두리 색상 정의 (여기서는 사용하지 않지만, UnitPanel 등에서 사용)
const COST_COLORS = {
  1: '#808080', // 회색
  2: '#1E823C', // 초록
  3: '#156293', // 파랑
  4: '#87259E', // 보라
  5: '#B89D29'  // 노랑
};

// 특성 스타일 관련 상수 (백엔드와 동기화 필요)
const IDX2KEY = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_RANK = { prismatic:4, gold:3, silver:2, bronze:1, unique:4, none:0 };
const PALETTE = {
  bronze   : '#C67A32', silver   : '#BFC4CF', gold     : '#FFD667',
  prismatic: '#CFF1F1', unique   : '#FFA773',
};


export default function SynergyPanel({ placedUnits }) {
  const { traits: allTraits } = useTFTData(); // allTraits 가져옴

  const traitCount = useMemo(() => {
    const cnt = {};
    Object.values(placedUnits).forEach(u => {
      if (u.traits && Array.isArray(u.traits)) {
        u.traits.forEach(traitApiName => {
          cnt[traitApiName] = (cnt[traitApiName] || 0) + 1;
        });
      } else {
          console.warn(`[SynergyPanel] 챔피언 '${u.name}' (API: ${u.apiName})에 traits 정보가 없거나 배열이 아닙니다.`, u.traits);
      }
    });
    return cnt;
  }, [placedUnits]);

  // 이 useMemo 훅 내의 시너지 계산 로직은
  // 백엔드 API 연동 전까지 임시로 기존 로직을 사용합니다.
  // 백엔드 API가 구현되면 이 부분을 API 호출 및 데이터 렌더링으로 대체할 것입니다.
  const displayedSynergies = useMemo(
    () => {
      if (!allTraits) return [];
      
      const calculatedTraits = allTraits
        .map(tr => {
          const count = traitCount[tr.apiName] || 0;
          
          let currentThreshold = 0;
          let activeStyleKey = 'none';
          let activeStyleOrder = 0;
          let nextThreshold = null;
          let nextStyleKey = null;

          const sortedEffects = [...tr.effects].sort((a,b) => a.minUnits - b.minUnits);

          for (let i = 0; i < sortedEffects.length; i++) {
              const effect = sortedEffects[i];
              if (count >= effect.minUnits) {
                  currentThreshold = effect.minUnits;
                  activeStyleKey = (typeof effect.style === 'number')
                      ? (IDX2KEY[effect.style] || 'bronze')
                      : (effect.style?.toLowerCase() || 'bronze');
                  activeStyleOrder = STYLE_RANK[activeStyleKey] || 0;
              } else {
                  if (nextThreshold === null && effect.minUnits > 0) {
                      nextThreshold = effect.minUnits;
                      nextStyleKey = (typeof effect.style === 'number')
                          ? (IDX2KEY[effect.style] || 'bronze')
                          : (effect.style?.toLowerCase() || 'bronze');
                  }
              }
          }

          const isUniqueTrait = sortedEffects.length === 1 && sortedEffects[0].minUnits === 1;

          if (isUniqueTrait) {
              if (count >= 1) {
                  activeStyleKey = 'unique';
                  activeStyleOrder = STYLE_RANK['unique'];
                  currentThreshold = 1;
                  nextThreshold = null;
              } else {
                  nextThreshold = 1;
                  nextStyleKey = 'unique';
              }
          }

          const isActive = count >= currentThreshold && currentThreshold > 0;

          // 백엔드의 getTraitStyleInfo와 일치하도록 반환 값 구조를 맞춥니다.
          // 여기서는 프론트엔드에서 계산한 값을 반환합니다.
          return {
            name: tr.name,
            apiName: tr.apiName,
            icon: tr.icon, // Context에서 가져온 icon 사용
            tier_current: count,
            currentThreshold: currentThreshold,
            nextThreshold: nextThreshold,
            style: activeStyleKey, // 백엔드의 style 필드와 유사
            nextStyle: nextStyleKey,
            styleOrder: activeStyleOrder,
            isActive: isActive,
            color: PALETTE[activeStyleKey] || PALETTE['none'], // PALETTE에서 색상 가져옴
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
          return b.tier_current - a.tier_current;
        });
        
        return calculatedTraits;
    },
    [allTraits, placedUnits, traitCount]
  );

  // 이 함수들은 이제 PALETTE 상수와 연동되어 사용될 수 있습니다.
  const getSynergyColor = (style) => PALETTE[style] || PALETTE['none'];
  const getLightGrayColor = (style) => {
      switch (style) {
          case 'bronze': return '#8D6E63';
          case 'silver': return '#9E9E9E';
          case 'gold': return '#FFD54F';
          case 'prismatic': return '#A7D9E0';
          case 'unique': return '#E0B28C';
          default: return '#6E6E6E';
      }
  };


  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white h-full overflow-y-auto">
      <h2 className="mb-2 font-bold text-xl">시너지</h2>
      {displayedSynergies.length === 0 ? (
        <p className="text-gray-400 text-sm">배치된 유닛이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {displayedSynergies.map(tr => (
            <li 
              key={tr.apiName}
              className={`flex items-center gap-2 text-sm p-1 rounded ${tr.isActive ? 'text-white' : 'text-gray-400'}`}
              style={tr.isActive ? { backgroundColor: tr.color } : {}}
            >
              {tr.icon && 
                <img 
                  src={tr.icon} 
                  alt={tr.name} 
                  className={`w-6 h-6 rounded-full ${tr.isActive ? '' : 'opacity-50'}`}
                  style={tr.isActive ? {} : { filter: `grayscale(100%) brightness(0.8) sepia(1) hue-rotate(180deg) saturate(0.5) contrast(0.8)` }}
                />
              }
              <div className="flex-grow">
                <span className="font-semibold" style={tr.isActive ? {} : { color: getLightGrayColor(tr.nextStyle || tr.activeStyle) }}>{tr.name}</span>
              </div>
              <div className="text-right font-bold">
                {tr.isActive ? (
                    <span style={{ color: tr.color }}>{tr.tier_current} / {tr.currentThreshold}</span>
                ) : (
                    <span style={{ color: getLightGrayColor(tr.nextStyle || tr.activeStyle) }}>{tr.tier_current} / {tr.nextThreshold || 'N/A'}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}