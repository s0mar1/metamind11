// frontend/src/components/common/ChampionTooltip.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { useTFTData } from '../../context/TFTDataContext';
import { generateTooltip } from '../../utils/abilityTemplates.js';

const costColors = { 1: '#808080', 2: '#1E823C', 3: '#156293', 4: '#87259E', 5: '#B89D29' };
const getCostColor = cost => costColors[cost] || costColors[1];

const TraitInfo = ({ traitData }) => {
  if (!traitData || !traitData.icon) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 bg-gray-900 flex items-center justify-center rounded-full">
         <img src={traitData.icon} alt={traitData.name} className="w-4 h-4" />
      </div>
      <span className="text-xs text-gray-300">{traitData.name}</span>
    </div>
  );
};

export default function ChampionTooltip({ champion, position }) {
  // const { traitMap } = useTFTData(); // traitMap 더 이상 필요 없음

  if (!champion) return null;

  const { name = '', cost = 1, traits = [], stats = {}, recommendedItems = [] } = champion;
  const ability = champion.ability || champion.abilities?.[0];

  if (!name) return null;

  const tooltipData = generateTooltip(champion);

  // 특성 이름을 직접 사용
  const displayTraits = traits.filter(Boolean); // null 또는 undefined 특성 제거
    
  return (
    <div
      className="fixed z-50 w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl text-white pointer-events-none"
      style={{ top: position.y, left: position.x, fontFamily: "'Noto Sans KR', sans-serif", background: 'rgba(25, 28, 32, 0.95)' }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="w-12 h-12 rounded" style={{ border: `2px solid ${getCostColor(cost)}` }}>
          <img src={champion.tileIcon} alt={name} className="w-full h-full object-cover rounded-sm" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-base" style={{ color: getCostColor(cost) }}>{name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1">
            {displayTraits.map((traitName, index) => (
              <span key={index} className="text-xs text-gray-300">{traitName}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-yellow-400 font-bold">
            <span>{cost}</span>
            <div className="w-4 h-4 bg-yellow-400 rounded-full" />
        </div>
      </div>

      {ability && tooltipData && (
        <div className="py-3 border-t border-gray-700 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src={ability.icon} alt={tooltipData.name} className="w-8 h-8 rounded" />
              <p className="font-bold text-gray-200 text-sm">{tooltipData.name}</p>
            </div>
            <p className="text-gray-400 text-xs font-mono">마나: {tooltipData.mana}</p>
          </div>
          
          <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
            {tooltipData.description}
          </p>
          
          <div className="space-y-1.5 pt-1">
            {tooltipData.values.map((detail, i) => (
              <div key={i} className="text-gray-400 text-xs flex justify-between">
                <span>{detail.label}</span>
                <span className="font-bold text-right text-blue-300">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-gray-700">
        <p className="font-bold text-gray-300 text-xs mb-1.5">추천 아이템</p>
        <div className="flex gap-1.5">
            <p className="text-xs text-gray-500">추천 아이템 정보가 없습니다.</p>
        </div>
      </div>
    </div>
  );
}

ChampionTooltip.propTypes = {
  champion: PropTypes.object,
  position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }).isRequired,
};