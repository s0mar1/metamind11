import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';

/* ───── 코스트별 테두리 색상 ───── */
const COST_COLORS = {
  1: '#808080',
  2: '#1E823C',
  3: '#156293',
  4: '#87259E',
  5: '#B89D29',
};

/*───────────────────────────── DraggableUnit ─────────────────────────────*/
function DraggableUnit({ champion }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.UNIT,
      item: { championApiName: champion.apiName },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [champion],
  );

  if (!champion?.tileIcon) return null;
  const borderColor = COST_COLORS[champion.cost] || COST_COLORS[1];

  return (
    <div ref={drag} className="flex flex-col items-center w-[52px] gap-0.5">
      <div
        className={`rounded-md overflow-hidden shadow-md cursor-grab ${
          isDragging ? 'opacity-50' : 'opacity-100'
        }`}
        style={{ width: 52, height: 52, border: `2px solid ${borderColor}` }}
        title={champion.name}
      >
        <img src={champion.tileIcon} alt={champion.name} className="w-full h-full object-cover" />
      </div>
      <span className="block w-full text-center text-[0.55rem] leading-tight truncate">
        {champion.name}
      </span>
    </div>
  );
}

/*────────────────────────────── UnitPanel ───────────────────────────────*/
export default function UnitPanel() {
  const { champions, loading } = useTFTData();
  const [filterCost, setFilterCost] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!champions) return [];
    return champions
      .filter((c) => (!filterCost ? true : Number(c.cost) === filterCost))
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.cost !== b.cost ? a.cost - b.cost : a.name.localeCompare(b.name, 'ko')));
  }, [champions, filterCost, search]);

  if (loading) return <div className="text-gray-300">유닛 목록 로딩 중...</div>;

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white h-full overflow-y-auto space-y-2">
      <h2 className="font-bold text-xl">유닛 목록</h2>

      {/* 필터 + 검색 한 줄 */}
      <div className="flex items-center gap-1 mb-2">
        {/* 코스트 필터 */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilterCost(null)}
            className={`px-2 py-0.5 rounded text-xs ${
              filterCost === null ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {[1, 2, 3, 4, 5].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCost(c)}
              className={`px-2 py-0.5 rounded text-xs ${
                filterCost === c ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 검색창(고정폭) */}
        <input
          type="text"
          placeholder="검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto p-1 text-black rounded bg-gray-200 text-xs flex-shrink-0"
          style={{ width: '200px' }}
        />
      </div>

      {/* 챔피언 그리드 */}
      <div
        className="grid gap-x-[3px] gap-y-0.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill,52px)' }}
      >
        {filtered.map((ch) => (
          <DraggableUnit key={ch.apiName} champion={ch} />
        ))}
      </div>
    </div>
  );
}
