import React, { useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';

function DraggableItem({ item }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ITEM,
    item: { item }, // item 객체 전체를 전달
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab', // cursor style to indicate draggable
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
      />
    </div>
  );
}

export default function ItemPanel() {
  // 💡 수정: allItems는 이제 tftData.items의 분류된 객체로 받음
  const { items: categorizedItemsFromTFTData, augments: allAugments, loading } = useTFTData();
  const [activeTab, setActiveTab] = useState('basic');

  // 💡 수정: useMemo 로직 간소화 (tftData에서 이미 분류되어 넘어오므로)
  const categorizedItems = useMemo(() => {
    if (!categorizedItemsFromTFTData) {
      return {
        basic: [], completed: [], ornn: [], radiant: [], emblem: [], support: [], robot: [], augments: [],
      };
    }
    return {
      basic: categorizedItemsFromTFTData.basic || [],
      completed: categorizedItemsFromTFTData.completed || [],
      ornn: categorizedItemsFromTFTData.ornn || [],
      radiant: categorizedItemsFromTFTData.radiant || [],
      emblem: categorizedItemsFromTFTData.emblem || [],
      support: categorizedItemsFromTFTData.support || [], // 💡 추가: support items
      robot: categorizedItemsFromTFTData.robot || [],     // 💡 추가: robot items
      augments: allAugments || [], // 증강체는 여전히 allAugments에서 받음
    };
  }, [categorizedItemsFromTFTData, allAugments]);


  // 💡 수정: 탭 정의 - 새로운 분류 카테고리 추가
  const tabs = [
    { id: 'basic', name: '기본 아이템', items: categorizedItems.basic },
    { id: 'completed', name: '완성 아이템', items: categorizedItems.completed },
    { id: 'ornn', name: '오른 아이템', items: categorizedItems.ornn },
    { id: 'radiant', name: '찬란한 아이템', items: categorizedItems.radiant },
    { id: 'emblem', name: '상징 아이템', items: categorizedItems.emblem },
    { id: 'support', name: '지원 아이템', items: categorizedItems.support }, // 💡 추가
    { id: 'robot', name: '골렘/봇 아이템', items: categorizedItems.robot },   // 💡 추가
    { id: 'augments', name: '증강체', items: categorizedItems.augments },
  ];

  if (loading) {
    return <div className="text-gray-300">아이템 목록 로딩 중...</div>;
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