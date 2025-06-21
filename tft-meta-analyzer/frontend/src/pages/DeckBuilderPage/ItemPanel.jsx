import React, { useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';

function DraggableItem({ item }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ITEM,
    item: { item },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        width: 40,
        height: 40,
        margin: 2,
      }}
      title={item.name}
    >
      <img
        src={item.icon}
        alt={item.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
            e.currentTarget.src = '/item_fallback.png';
            e.currentTarget.onerror = null;
        }}
      />
    </div>
  );
}

export default function ItemPanel() {
  const { items: itemsByCategory, augments: allAugments, loading, error } = useTFTData(); // 💡 error도 가져옴
  const [activeTab, setActiveTab] = useState('basic');

  const categorizedItems = useMemo(() => {
    // 💡 추가: itemsByCategory와 allAugments의 내용 로그
    console.log('DEBUG_ITEMPANEL_DATA: itemsByCategory (from useTFTData):', itemsByCategory);
    console.log('DEBUG_ITEMPANEL_DATA: allAugments (from useTFTData):', allAugments);

    if (!itemsByCategory) {
      return {
        basic: [], completed: [], ornn: [], radiant: [], emblem: [], support: [], robot: [], augments: [], unknown: [],
      };
    }
    return {
      basic: itemsByCategory.basic || [],
      completed: itemsByCategory.completed || [],
      ornn: itemsByCategory.ornn || [],
      radiant: itemsByCategory.radiant || [],
      emblem: itemsByCategory.emblem || [],
      support: itemsByCategory.support || [],
      robot: itemsByCategory.robot || [],
      augments: allAugments || [],
      unknown: itemsByCategory.unknown || [],
    };
  }, [itemsByCategory, allAugments]);

  // 💡 추가: 각 카테고리 배열의 길이 로그
  console.log('DEBUG_ITEMPANEL_CATEGORIES_LENGTH:', {
      basic: categorizedItems.basic.length,
      completed: categorizedItems.completed.length,
      ornn: categorizedItems.ornn.length,
      radiant: categorizedItems.radiant.length,
      emblem: categorizedItems.emblem.length,
      support: categorizedItems.support.length,
      robot: categorizedItems.robot.length,
      augments: categorizedItems.augments.length,
      unknown: categorizedItems.unknown.length,
  });


  const tabs = [
    { id: 'basic', name: '기본 아이템', items: categorizedItems.basic },
    { id: 'completed', name: '완성 아이템', items: categorizedItems.completed },
    { id: 'ornn', name: '오른 아이템', items: categorizedItems.ornn },
    { id: 'radiant', name: '찬란한 아이템', items: categorizedItems.radiant },
    { id: 'emblem', name: '상징 아이템', items: categorizedItems.emblem },
    { id: 'support', name: '지원 아이템', items: categorizedItems.support },
    { id: 'robot', name: '골렘/봇 아이템', items: categorizedItems.robot },
    { id: 'augments', name: '증강체', items: categorizedItems.augments },
    { id: 'unknown', name: '미분류', items: categorizedItems.unknown }, // 미분류 탭 추가
  ];

  if (loading) {
    return <div className="text-gray-300">아이템 목록 로딩 중...</div>;
  }
  // 💡 추가: 에러 발생 시 메시지 표시
  if (error) {
    return <div className="text-red-400">데이터 로딩 오류: {error}</div>;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white space-y-4 h-full flex flex-col">
      <h2 className="text-xl font-bold">아이템</h2>

      <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`py-2 px-4 text-sm font-medium focus:outline-none whitespace-nowrap 
                        ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name} ({tab.items.length})
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto">
        {tabs.map(tab => (
          <section key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
            <div className="flex flex-wrap">
              {tab.items.length > 0
                ? tab.items.map(item => (
                    <DraggableItem key={item.apiName} item={item} />
                  ))
                : <p className="text-gray-400 text-sm p-2">해당 카테고리에 아이템이 없습니다.</p>
              }
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}