import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';

const COST_COLORS = {
  1: '#808080',
  2: '#1E823C',
  3: '#156293',
  4: '#87259E',
  5: '#B89D29',
};

function DraggableUnit({ champion }) {
  const { showTooltip, hideTooltip } = useTFTData();
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
    <div 
      ref={drag} 
      className="flex flex-col items-center w-[52px] gap-0.5"
      onMouseEnter={(e) => showTooltip(champion, e)}
      onMouseLeave={hideTooltip}
    >
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



export default function UnitPanel({ mini = false }) {
  const { champions, traits, loading } = useTFTData();
  const [filterTrait, setFilterTrait] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cost'); // 'cost', 'origin', 'class'

  const filtered = useMemo(() => {
    if (!champions) return [];

    let currentChampions = champions;

    // 검색 필터링
    if (search) {
      const lowerCaseSearch = search.toLowerCase();
      currentChampions = currentChampions.filter(c => c.name.toLowerCase().includes(lowerCaseSearch));
    }

    // 탭에 따른 필터링 및 정렬
    if (activeTab === 'cost') {
      const sorted = currentChampions.sort((a, b) => (a.cost !== b.cost ? a.cost - b.cost : a.name.localeCompare(b.name, 'ko')));
      return sorted;
    } else if (activeTab === 'origin' || activeTab === 'class') {
      if (filterTrait) {
        currentChampions = currentChampions.filter(c => c.traits.includes(filterTrait)); // 💡 수정: 챔피언의 traits (한국어 이름)와 filterTrait (선택된 한국어 이름) 비교
      }
      return currentChampions; // 필터링만 수행, 정렬은 그룹화에서
    }

    return currentChampions; // 기본값
  }, [champions, filterTrait, search, activeTab]);

  const origins = useMemo(() => {
    const result = (traits || []).filter(t => t.type === 'origin');
    return result;
  }, [traits]);
  const classes = useMemo(() => {
    const result = (traits || []).filter(t => t.type === 'class');
    return result;
  }, [traits]);

  const groupedChampions = useMemo(() => {
    if (activeTab === 'cost') return null; // 가격순 탭에서는 그룹화하지 않음

    const groupMap = new Map();
    const targetTraits = activeTab === 'origin' ? origins : classes;

    // 챔피언을 해당 계열/직업에 따라 그룹화
    filtered.forEach(champion => {
      champion.traits.forEach(traitName => { // 💡 수정: traitApiName 대신 traitName 사용
        const foundTrait = targetTraits.find(t => t.name === traitName); // 💡 수정: t.apiName 대신 t.name과 비교
        if (foundTrait) {
          if (!groupMap.has(foundTrait.apiName)) { // 💡 apiName은 그룹 키로 계속 사용
            groupMap.set(foundTrait.apiName, { trait: foundTrait, champions: [] });
          }
          groupMap.get(foundTrait.apiName).champions.push(champion);
        }
      });
    });

    // 그룹화된 챔피언들을 정렬 (예: 비용순, 이름순)
    groupMap.forEach(group => {
      group.champions.sort((a, b) => (a.cost !== b.cost ? a.cost - b.cost : a.name.localeCompare(b.name, 'ko')));
    });

    // 그룹 자체를 이름순으로 정렬
    const result = Array.from(groupMap.values()).sort((a, b) => a.trait.name.localeCompare(b.trait.name, 'ko'));
    return result;
  }, [filtered, activeTab, origins, classes]);

  if (loading) return <div className="text-gray-800">유닛 목록 로딩 중...</div>;

  if (mini) {
    return (
      <div className="h-full overflow-y-auto">
        <div
          className="grid gap-x-[2px] gap-y-1"
          style={{ gridTemplateColumns: 'repeat(auto-fill, 32px)' }}
        >
          {filtered.map((ch) => (
            <div 
              key={ch.apiName}
              className="w-8 h-8 rounded-md overflow-hidden shadow-md"
              title={ch.name}
            >
              <img src={ch.tileIcon} alt={ch.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg text-gray-800 h-full overflow-y-auto space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl">유닛 목록</h2>
        <input
          type="text"
          placeholder="검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-1 text-black rounded bg-gray-200 text-xs"
          style={{ width: '150px' }}
        />
      </div>

      {/* 메인 필터 탭 */}
      <div className="flex border-b border-gray-300 mb-3">
        <button
          onClick={() => { setActiveTab('cost'); setFilterTrait(null); }}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'cost' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-gray-600 hover:text-text-primary'}`}
        >
          가격순
        </button>
        <button
          onClick={() => setActiveTab('origin')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'origin' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-gray-600 hover:text-text-primary'}`}
        >
          계열
        </button>
        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'class' ? 'text-brand-mint border-b-2 border-brand-mint' : 'text-gray-600 hover:text-text-primary'}`}
        >
          직업
        </button>
      </div>

      {/* 필터 섹션 (activeTab에 따라 조건부 렌더링) */}
      {activeTab === 'origin' && (
        <div className="space-y-2">
          <FilterGroup title="계열" items={origins} selected={filterTrait} onSelect={setFilterTrait} />
        </div>
      )}
      {activeTab === 'class' && (
        <div className="space-y-2">
          <FilterGroup title="직업" items={classes} selected={filterTrait} onSelect={setFilterTrait} />
        </div>
      )}

      {/* 챔피언 그리드 */}
      {activeTab === 'cost' ? (
        <div
          className="grid gap-x-[3px] gap-y-2 pt-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}
        >
          {filtered.map((ch) => (
            <DraggableUnit key={ch.apiName} champion={ch} />
          ))}
        </div>
      ) : (
        <div className="space-y-4 pt-2"> {/* 그룹별 컨테이너 */}
          {groupedChampions && groupedChampions.map(group => (
            <div key={group.trait.apiName}>
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                {group.trait.icon && <img src={group.trait.icon} alt={group.trait.name} className="w-6 h-6" />}
                {group.trait.name}
              </h3>
              <div
                className="grid gap-x-[3px] gap-y-2"
                style={{ gridTemplateColumns: 'repeat(auto-fill, 52px)' }}
              >
                {group.champions.map((ch) => (
                  <DraggableUnit key={ch.apiName} champion={ch} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, items, selected, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-1.5">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => {
          const value = item.value ?? item.apiName;
          const isSelected = selected === value;
          return (
            <button
              key={item.name}
              onClick={() => onSelect(item.name)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors duration-200 ${isSelected ? 'bg-brand-mint text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 hover:text-text-primary'}`}>
              {item.icon && <img src={item.icon} alt={item.name} className="w-4 h-4" />}
              <span>{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}