// frontend/src/pages/DeckBuilderPage/ItemPanel.jsx
import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';

/**
 * 드래그 가능한 아이템 컴포넌트
 */
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
        cursor: 'move',
        width: 48,
        height: 48,
        margin: 4,
      }}
    >
      <img
        src={item.icon}
        alt={item.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

/**
 * 전체 아이템 패널
 *
 * @param {object[]} items    일반 아이템 목록 (기본값: [])
 * @param {object[]} augments 어그먼트(유물) 목록 (기본값: [])
 * @param {function} onEquip  드롭 콜백 (선택적)
 */
export default function ItemPanel({
  items = [],     // 여기에 기본값 [] 설정
  augments = [], // 여기에 기본값 [] 설정
  onEquip = () => {},
}) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white space-y-4">
      <h2 className="text-lg font-bold">아이템</h2>

      {/* 일반 아이템 섹션 */}
      <section>
        <h3 className="font-semibold mb-2">일반 아이템</h3>
        <div
          className="flex flex-wrap overflow-auto"
          style={{ maxHeight: 200 }}
        >
          {items.length > 0
            ? items.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400">로딩 중이거나 아이템이 없습니다.</p>
          }
        </div>
      </section>

      {/* 유물 아이템(어그먼트) 섹션 */}
      <section>
        <h3 className="font-semibold mb-2">유물 아이템</h3>
        <div
          className="flex flex-wrap overflow-auto"
          style={{ maxHeight: 200 }}
        >
          {augments.length > 0
            ? augments.map(aug => (
                <DraggableItem key={aug.apiName} item={aug} />
              ))
            : <p className="text-gray-400">로딩 중이거나 유물 아이템이 없습니다.</p>
          }
        </div>
      </section>
    </div>
  );
}
