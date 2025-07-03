import React, { useMemo } from 'react';
import { useTFTData } from '../../context/TFTDataContext';

const IDX2KEY = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_RANK = { prismatic: 4, gold: 3, silver: 2, bronze: 1, unique: 4, none: 0 };
const PALETTE = {
  bronze: '#C67A32',
  silver: '#BFC4CF',
  gold: '#FFD667',
  prismatic: '#CFF1F1',
  unique: '#FFA773',
};

const getIconFilter = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? 'invert(1)' : 'none';
};

export default function SynergyPanel({ placedUnits }) {
  const { traits: allTraits, krNameMap, showTooltip, hideTooltip } = useTFTData();

  // krNameMap을 역으로 사용하여 한국어 이름 -> apiName 매핑 생성
  const koreanToApiNameMap = useMemo(() => {
    const map = new Map();
    if (!krNameMap) return map;

    const entries = krNameMap instanceof Map ? krNameMap.entries() : Object.entries(krNameMap);

    for (const [apiName, koreanName] of entries) {
      if (!map.has(koreanName)) {
        map.set(koreanName, apiName);
      }
    }
    return map;
  }, [krNameMap]);

  const traitCount = useMemo(() => {
    const counts = {};
    // Ensure placedUnits is an array before iterating
    if (!Array.isArray(placedUnits)) {
      console.warn('[SynergyPanel] placedUnits is not an array:', placedUnits);
      return counts;
    }
    placedUnits.forEach(unit => {
      if (unit.traits && Array.isArray(unit.traits)) {
        const uniqueTraits = new Set(unit.traits);
        uniqueTraits.forEach(koreanTraitName => {
          const traitApiName = koreanToApiNameMap.get(koreanTraitName);
          if (traitApiName) {
            counts[traitApiName] = (counts[traitApiName] || 0) + 1;
          } else {
            console.warn(`[SynergyPanel] Unknown Korean trait name: "${koreanTraitName}". Cannot map to API name. Check if this name exists in krNameMap.`);
          }
        });
      }
    });
    return counts;
  }, [placedUnits, koreanToApiNameMap]);

  const displayedSynergies = useMemo(() => {
    if (!allTraits || allTraits.length === 0) {
      return [];
    }

    const calculatedTraits = allTraits
      .map(trait => {
        const count = traitCount[trait.apiName] || 0;
        if (count === 0) {
          return null;
        }

        const sortedEffects = [...trait.effects].sort((a, b) => a.minUnits - b.minUnits);
        
        let activeStyleKey = 'none';
        let currentThreshold = 0;
        let nextThreshold = null;

        for (const effect of sortedEffects) {
          if (count >= effect.minUnits) {
            currentThreshold = effect.minUnits;
            activeStyleKey = (typeof effect.style === 'number' ? IDX2KEY[effect.style] : effect.style?.toLowerCase()) || 'bronze';
          } else if (nextThreshold === null) {
            nextThreshold = effect.minUnits;
          }
        }
        
        if (sortedEffects.length === 1 && sortedEffects[0].minUnits === 1) {
            activeStyleKey = 'unique';
        }

        const isActive = count >= currentThreshold && currentThreshold > 0;
        const styleOrder = STYLE_RANK[activeStyleKey] || 0;
        const color = PALETTE[activeStyleKey] || '#374151';

        const result = {
          ...trait,
          tier_current: count,
          currentThreshold,
          nextThreshold,
          style: activeStyleKey,
          styleOrder,
          isActive,
          color,
          iconFilter: getIconFilter(color),
        };
        return result;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
        return b.tier_current - a.tier_current;
      });
      
    return calculatedTraits;
  }, [allTraits, traitCount]);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold text-gray-800 mb-2">특성</h3>
      {displayedSynergies.length > 0 ? (
        displayedSynergies.map(synergy => (
          <SynergyItem key={synergy.apiName} synergy={synergy} showTooltip={showTooltip} hideTooltip={hideTooltip} />
        ))
      ) : (
        <p className="text-gray-800 text-sm">챔피언을 배치하여 특성을 확인하세요.</p>
      )}
    </div>
  );
}

function SynergyItem({ synergy, showTooltip, hideTooltip }) {
  return (
    <div
      className={`flex items-center p-1.5 rounded-md transition-all duration-200 ${synergy.isActive ? 'bg-gray-100' : 'bg-gray-200 opacity-60'}`}
      onMouseEnter={(e) => showTooltip(synergy, e)}
      onMouseLeave={hideTooltip}
    >
      <div
        className="w-7 h-7 flex items-center justify-center rounded-sm"
        style={{ backgroundColor: synergy.color }}
      >
        <img 
          src={synergy.icon} 
          alt={synergy.name} 
          className="w-5 h-5"
          style={{ filter: synergy.iconFilter }}
        />
      </div>
      <div className="ml-2 flex-grow">
        <span className="text-sm font-semibold text-gray-800">{synergy.name}</span>
      </div>
      <div className="text-sm font-bold text-gray-800">
        {synergy.tier_current}
      </div>
    </div>
  );
}