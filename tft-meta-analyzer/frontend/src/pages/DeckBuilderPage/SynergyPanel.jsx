import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';
// import { getTraitStyleInfo } from '../../../backend/src/services/tftData'; // 이 라인을 제거하거나 주석 처리!

const COST_COLORS = {
  1: '#808080', // 회색
  2: '#1E823C', // 초록
  3: '#156293', // 파랑
  4: '#87259E', // 보라
  5: '#B89D29'  // 노랑
};

const IDX2KEY = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_RANK = { prismatic:4, gold:3, silver:2, bronze:1, unique:4, none:0 };
const PALETTE = {
  bronze   : '#C67A32', silver   : '#BFC4CF', gold     : '#FFD667',
  prismatic: '#CFF1F1', unique   : '#FFA773',
};


export default function SynergyPanel({ placedUnits }) {
  const { traits: allTraits } = useTFTData();

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

  const displayedSynergies = useMemo(
    () => { // <- useMemo의 콜백 함수 시작
      if (!allTraits) return [];

      const calculatedTraits = allTraits
        .map(tr => {
          const count = traitCount[tr.apiName] || 0;

          if (count === 0) {
            return null;
          }

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

          return {
            name: tr.name,
            apiName: tr.apiName,
            icon: tr.icon,
            tier_current: count,
            currentThreshold: currentThreshold,
            nextThreshold: nextThreshold,
            style: activeStyleKey,
            nextStyle: nextStyleKey,
            styleOrder: activeStyleOrder,
            isActive: isActive,
            color: PALETTE[activeStyleKey] || PALETTE['none'],
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
          return b.tier_current - a.tier_current;
        });

      return calculatedTraits;
    }, // <- useMemo 콜백 함수 끝
    [allTraits, placedUnits, traitCount] // <- 의존성 배열
  ); // <- useMemo 닫는 괄호
} // <- export default function SynergyPanel 닫는 괄호