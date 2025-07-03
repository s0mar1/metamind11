import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTFTData } from '../../context/TFTDataContext';
import { decodeDeck } from '../../utils/deckCode';

// Import Trait component
import Trait from '../summoner/components/Trait'; // Correct path for Trait component

const getDifficultyColor = (difficulty) => {
  const colorMap = { Easy: 'bg-green-600', Medium: 'bg-yellow-600', Hard: 'bg-red-600' };
  return colorMap[difficulty] || 'bg-gray-600';
};

// Helper for trait style calculation (similar to SynergyPanel's internal logic)
const IDX2KEY = ['none', 'bronze', 'silver', 'gold', 'prismatic'];
const STYLE_RANK = { prismatic: 4, gold: 3, silver: 2, bronze: 1, unique: 4, none: 0 };

const calculateActiveTraits = (unitsArray, allTraits, koreanToApiNameMap) => {
  const traitCounts = {};
  unitsArray.forEach(unit => {
    if (unit.traits && Array.isArray(unit.traits)) {
      const uniqueTraits = new Set(unit.traits);
      uniqueTraits.forEach(koreanTraitName => {
        const traitApiName = koreanToApiNameMap.get(koreanTraitName);
        if (traitApiName) {
          traitCounts[traitApiName] = (traitCounts[traitApiName] || 0) + 1;
        }
      });
    }
  });

  const activeTraits = allTraits
    .map(trait => {
      const count = traitCounts[trait.apiName] || 0;
      if (count === 0) return null;

      const sortedEffects = [...trait.effects].sort((a, b) => a.minUnits - b.minUnits);
      
      let activeStyleKey = 'none';
      let currentThreshold = 0;

      for (const effect of sortedEffects) {
        if (count >= effect.minUnits) {
          currentThreshold = effect.minUnits;
          activeStyleKey = (typeof effect.style === 'number' ? IDX2KEY[effect.style] : effect.style?.toLowerCase()) || 'bronze';
        }
      }
      
      if (sortedEffects.length === 1 && sortedEffects[0].minUnits === 1) {
          activeStyleKey = 'unique';
      }

      const isActive = count >= currentThreshold && currentThreshold > 0;
      const styleOrder = STYLE_RANK[activeStyleKey] || 0;

      return {
        ...trait,
        tier_current: count,
        style: activeStyleKey,
        isActive,
        styleOrder,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if (b.styleOrder !== a.styleOrder) return b.styleOrder - a.styleOrder;
      return b.tier_current - a.tier_current;
    });
  return activeTraits;
};


const GuideCard = ({ guide, champions, allItems, traitMap, allTraits }) => { // Added allTraits prop
  const previewBoard = guide.level_boards.find(b => b.level === guide.initialDeckLevel) || guide.level_boards.find(b => b.level === 8) || guide.level_boards[0];
  const units = previewBoard ? decodeDeck(previewBoard.board, champions, allItems) : {};
  const unitsArray = Object.values(units);

  // Replicate koreanToApiNameMap from SynergyPanel
  const koreanToApiNameMap = useMemo(() => {
    const map = new Map();
    if (!traitMap) return map;
    // traitMap is already apiName -> koreanName. We need koreanName -> apiName
    // Assuming traitMap is a Map object
    for (const [apiName, koreanName] of traitMap.entries()) {
      if (!map.has(koreanName)) {
        map.set(koreanName, apiName);
      }
    }
    return map;
  }, [traitMap]);

  // Calculate active traits for the preview board
  const activeTraits = useMemo(() => {
    return calculateActiveTraits(unitsArray, allTraits, koreanToApiNameMap);
  }, [unitsArray, allTraits, koreanToApiNameMap]);

  // Core champions (max 5, sorted by cost descending)
  const coreChampions = unitsArray.sort((a, b) => b.cost - a.cost).slice(0, 5);

  return (
    <div className="flex items-center gap-6 p-4 bg-white rounded-lg shadow-md border-l-4" style={{ borderLeftColor: getDifficultyColor(guide.difficulty).replace('bg-', '#') }}>
      <div className="flex items-center gap-4 flex-shrink-0 w-56">
        <div className={`flex items-center justify-center w-10 h-10 rounded-md text-white text-2xl font-bold ${getDifficultyColor(guide.difficulty)}`}>
          {guide.difficulty.charAt(0)} {/* 난이도 첫 글자 표시 */}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800 truncate">{guide.title}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getDifficultyColor(guide.difficulty)}`}>
            {guide.difficulty}
          </span>
        </div>
      </div>

      <div className="flex-grow flex items-start gap-1.5">
        {coreChampions.map(unit => (
          <div key={unit.apiName} className="relative flex flex-col items-center"> {/* Added relative for absolute positioning of traits */}
            <img
              src={unit.tileIcon}
              alt={unit.name}
              className="w-12 h-12 rounded-md"
              style={{ borderColor: `var(--cost${unit.cost}-color)` }}
            />
            {/* Display active traits for this unit */}
            <div className="absolute -top-2 -right-2 flex flex-wrap gap-0.5"> {/* Position traits on top-right */}
              {unit.traits.map(unitTraitName => {
                const traitApiName = koreanToApiNameMap.get(unitTraitName);
                const traitData = activeTraits.find(t => t.apiName === traitApiName);
                // Ensure traitData exists and is active before rendering
                if (traitData && traitData.isActive) {
                  return (
                    <Trait key={traitData.apiName} trait={traitData} showCount={false} />
                  );
                }
                return null;
              })}
            </div>
            <span className="text-xs text-gray-500 truncate w-12 text-center">{unit.name}</span>
          </div>
        ))}
      </div>
      
      {/* Removed the old "주요 특성" div */}
      
      <div className="flex-shrink-0">
        <Link to={`/guides/${guide._id}`} className="p-2 text-gray-500 text-2xl hover:bg-gray-100 rounded-md">
          공략 보기
        </Link>
      </div>
    </div>
  );
};

export default function GuideListPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { champions, traits: allTraits, traitMap, allItems } = useTFTData(); // Added allTraits

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const response = await axios.get('/api/guides');
        setGuides(response.data.data);
      } catch (err) {
        setError('공략을 불러오는 데 실패했습니다.');
        console.error(err);
      }
      setLoading(false);
    };

    if (champions.length > 0 && allTraits.length > 0) { // Ensure allTraits is also loaded
        fetchGuides();
    }
  }, [champions, allTraits]); // Added allTraits to dependency array

  if (loading) return <div className="py-8 text-center text-gray-500">공략 목록을 불러오는 중...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">추천 덱 공략</h1>
      <p className="text-center text-gray-500 mb-8">최신 공략 데이터를 기반으로 집계된 덱 공략입니다.</p>
      
      {guides.length > 0 ? (
        <div className="flex flex-col gap-3">
          {guides.map((guide) => (
            <GuideCard
              key={guide._id}
              guide={guide}
              champions={champions}
              allItems={allItems}
              traitMap={traitMap}
              allTraits={allTraits} // Pass allTraits to GuideCard
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          아직 작성된 공략이 없습니다. <br />
          새로운 공략을 작성해 보세요!
        </div>
      )}
    </div>
  );
}