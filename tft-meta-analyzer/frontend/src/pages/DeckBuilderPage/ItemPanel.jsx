// frontend/src/pages/DeckBuilderPage/ItemPanel.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext';

/* ---------------- 단일 아이콘 ---------------- */
function DraggableItem({ item }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ITEM,
    item: { item },
    collect: m => ({ isDragging: m.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      title={item.name}
      style={{
        width: 36,
        height: 36,
        margin: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <img
        src={item.icon || '/item_fallback.png'}
        alt={item.name}
        onError={e => (e.currentTarget.src = '/item_fallback.png')}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

/* ---------------- 아이템 패널 ---------------- */
export default function ItemPanel() {
  const { itemsByCategory, loading, error } = useTFTData();

  /* “ ~아이템” 같은 불필요한 꼬리를 없애기 위한 문자열 목록 */
  const LABEL_TRIM = [' 아이템', '아이템'];

  const tabs = useMemo(() => {
    if (!itemsByCategory) return [];

    return Object.entries(itemsByCategory)
      .filter(([, list]) => list?.length) // 빈 카테고리 제거
      .map(([id, list]) => {
        let label = id;
        LABEL_TRIM.forEach(suffix => {
          if (label.endsWith(suffix)) label = label.slice(0, -suffix.length).trim();
        });
        return { id, label, items: list };
      });
  }, [itemsByCategory]);

  const [active, setActive] = useState('');
  useEffect(() => {
    if (!active && tabs.length) setActive(tabs[0].id);
  }, [tabs, active]);

  /* --------------- 화면 --------------- */
  if (loading) return <p className="text-gray-300">아이템 로딩 중…</p>;
  if (error)   return <p className="text-red-400">로드 오류: {error}</p>;
  if (!tabs.length) return <p className="text-gray-400">표시할 아이템이 없습니다.</p>;

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white flex flex-col h-full">
      <h2 className="text-xl font-bold mb-3">아이템</h2>

      {/* 탭 버튼 */}
      <div className="flex overflow-x-auto border-b border-gray-700 mb-3">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-1 text-sm whitespace-nowrap ${
              active === t.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label} ({t.items.length})
          </button>
        ))}
      </div>

      {/* 아이콘 그리드 */}
      <div className="flex-grow overflow-y-auto">
        {tabs.map(t => (
          <div key={t.id} className={active === t.id ? 'block' : 'hidden'}>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(auto-fill, 36px)' }}
            >
              {t.items.map(it => (
                <DraggableItem key={it.apiName} item={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
