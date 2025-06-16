import React, { useState, useMemo } from 'react';
import { useDrag }         from 'react-dnd';
import { ItemTypes }       from '../../constants';

export default function UnitPanel({ champions, loading }) {
  const [filterCost, setFilterCost] = useState(null);
  const [search, setSearch]         = useState('');

  const filtered = useMemo(() => {
    return champions
      .filter(c => !filterCost || Number(c.cost) === filterCost)
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [champions, filterCost, search]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white">
      <h2 className="mb-2 font-bold">유닛 목록</h2>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setFilterCost(null)}
          className={`px-2 py-1 rounded ${filterCost === null ? 'bg-white text-black' : 'bg-gray-700'}`}
        >
          All
        </button>
        {[1,2,3,4,5].map(cost => (
          <button
            key={cost}
            onClick={() => setFilterCost(cost)}
            className={`px-2 py-1 rounded ${filterCost === cost ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            ${cost}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="챔피언 이름 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full p-1 mb-2 text-black rounded"
      />
      <div className="grid grid-cols-3 gap-2 overflow-auto max-h-[60vh]">
        {filtered.map(ch => (
          <DraggableUnit key={ch.apiName} champion={ch} />
        ))}
      </div>
    </div>
  );
}

function DraggableUnit({ champion }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.UNIT,
    item: { champion },
    collect: m => ({ isDragging: m.isDragging() }),
  });

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-grab"
      title={champion.name}
    >
      <img
        src={champion.tileIcon}
        alt={champion.name}
        className="w-full h-auto rounded-lg"
      />
    </div>
  );
}
