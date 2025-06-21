// frontend/src/pages/DeckBuilderPage/ItemPanel.jsx

import React, { useMemo, useState, useEffect } from 'react';
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

  // 백엔드가 보내준 정확한 아이콘 URL을 사용합니다.
  const iconUrl = item && item.icon ? item.icon : '';

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
        src={iconUrl}
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
  // 💡 핵심: 이제 'itemsByCategory' 데이터만 사용합니다.
  // 이 데이터는 백엔드에서 이미 모든 가공이 끝난 완벽한 데이터입니다.
  const { itemsByCategory, loading, error } = useTFTData();
  
  // 💡 이제 프론트엔드에서는 더 이상 복잡한 조합 로직이 필요 없습니다.
  // 백엔드가 보내준 데이터 구조를 그대로 사용하여 탭을 생성합니다.
  const tabs = useMemo(() => {
    if (loading || !itemsByCategory) return [];
    
    return Object.keys(itemsByCategory).map(key => ({
      id: key,
      name: key,
      items: itemsByCategory[key] || [],
    })).filter(tab => tab.items.length > 0); // 아이템이 있는 탭만 표시

  }, [itemsByCategory, loading]);

  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  if (loading) {
    return <div className="text-gray-300">아이템 목록 로딩 중...</div>;
  }
  if (error) {
    return <div className="text-red-400">데이터 로딩 오류: {error}</div>;
  }
  if (tabs.length === 0) {
    return <div className="text-gray-400">표시할 아이템 데이터가 없습니다.</div>;
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
              {tab.items.map((item, index) => (
                <DraggableItem key={`${item.apiName}-${index}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}