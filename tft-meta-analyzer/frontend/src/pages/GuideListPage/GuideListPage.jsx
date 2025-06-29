import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTFTData } from '../../context/TFTDataContext';
import { decodeDeck } from '../../utils/deckCode';

// 임시 시너지 패널 컴포넌트 (실제 SynergyPanel을 사용하거나 맞게 수정 필요)
const MiniSynergyPanel = ({ units, traitMap }) => {
  if (!units || Object.keys(units).length === 0) return null;

  const traits = {};
  Object.values(units).forEach(unit => {
    unit.traits.forEach(traitName => {
      if (!traits[traitName]) {
        const traitData = traitMap.get(traitName.toLowerCase());
        if (traitData) {
          traits[traitName] = { ...traitData, count: 0 };
        }
      }
      if (traits[traitName]) {
        traits[traitName].count += 1;
      }
    });
  });

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Object.values(traits).filter(t => t.count > 0).map(t => (
        <div key={t.apiName} className="flex items-center gap-1 bg-gray-700 px-1.5 py-0.5 rounded-sm">
          <img src={t.icon} alt={t.name} className="w-4 h-4" />
          <span className="text-xs">{t.name}</span>
        </div>
      ))}
    </div>
  );
};

export default function GuideListPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { champions, items, traitMap, allItems } = useTFTData();

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

    if (champions.length > 0) { // 기본 데이터 로딩 후 fetch
        fetchGuides();
    }
  }, [champions]);

  if (loading) return <div className="text-center p-8">공략 목록을 불러오는 중...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">추천 덱 공략</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map(guide => {
          const previewBoard = guide.level_boards.find(b => b.level === 8) || guide.level_boards[0];
          const units = previewBoard ? decodeDeck(previewBoard.board, champions, allItems) : {};
          const coreChampions = Object.values(units).sort((a, b) => b.cost - a.cost).slice(0, 5);

          return (
            <div key={guide._id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
              <div className="p-5">
                <h2 className="text-xl font-bold text-blue-300 truncate">{guide.title}</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${guide.difficulty === 'Easy' ? 'bg-green-600' : guide.difficulty === 'Medium' ? 'bg-yellow-600' : 'bg-red-600'}`}>
                  {guide.difficulty}
                </span>
                
                <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-400">핵심 챔피언</h3>
                    <div className="flex items-center gap-2 mt-2">
                        {coreChampions.map(unit => (
                            <img key={unit.apiName} src={unit.tileIcon} alt={unit.name} className="w-10 h-10 rounded-md border-2" style={{borderColor: `var(--cost${unit.cost}-color)`}}/>
                        ))}
                    </div>
                </div>

                <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-400">주요 특성</h3>
                    <MiniSynergyPanel units={units} traitMap={traitMap} />
                </div>
              </div>
              <Link to={`/guides/${guide._id}`} className="block bg-blue-600 text-center font-bold py-3 hover:bg-blue-700 transition-colors duration-200">
                공략 보기
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}