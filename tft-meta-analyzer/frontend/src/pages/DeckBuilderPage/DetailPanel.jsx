import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants';
import ChampionTooltip from '../../components/common/ChampionTooltip';

/**
 * 선택된 유닛 상세 정보 + 아이템 드롭존
 */
export default function DetailPanel({
  selectedUnit,
  onUnitRemove,
  onChangeStar,
  onEquip,
}) {
  // 아이템 드롭 받기
  const [{ isOver, canDrop }, drop] = useDrop({
    // accept 에 ITEM 타입을 반드시 정의해야 에러가 사라집니다.
    accept: ItemTypes.ITEM,
    drop: ({ item }) => {
      // onEquip(pos, item) 호출
      if (selectedUnit) {
        onEquip(selectedUnit.pos, item);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  if (!selectedUnit) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg text-gray-400">
        선택된 유닛이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white space-y-4">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">{selectedUnit.name}</h2>
        <button onClick={() => onUnitRemove(selectedUnit.pos)}>×</button>
      </div>

      {/* 별 등급 변경 */}
      <div>
        { [1,2,3].map(star => (
            <span
              key={star}
              className={
                selectedUnit.star >= star
                  ? 'text-yellow-300'
                  : 'text-gray-600'
              }
              style={{ cursor: 'pointer', fontSize: '1.5rem' }}
              onClick={() => onChangeStar(selectedUnit.pos, star)}
            >
              ★
            </span>
          ))
        }
      </div>

      {/* 아이템 드롭존 */}
      <div
        ref={drop}
        className={`flex gap-2 p-2 rounded border-2 ${
          isOver && canDrop
            ? 'border-green-400 bg-gray-700'
            : 'border-gray-600'
        }`}
      >
        {selectedUnit.items.map(it => (
          <div key={it.apiName} className="w-12 h-12">
            <img src={it.icon} alt={it.name} className="w-full h-full"/>
          </div>
        ))}
        {/* 비어있는 칸 */}
        {Array.from({ length: 4 - selectedUnit.items.length }).map((_, i) => (
          <div key={i} className="w-12 h-12 bg-gray-900 rounded" />
        ))}
      </div>
    </div>
  );
}
