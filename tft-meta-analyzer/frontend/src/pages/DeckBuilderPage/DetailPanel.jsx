import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants';

const COST_COLORS = {
    1: '#808080', 
    2: '#1E823C', 
    3: '#156293', 
    4: '#87259E', 
    5: '#B89D29'  
};

export default function DetailPanel({
  selectedUnit,
  onUnitRemove,
  onChangeStar,
  onEquip,
  onUnequip,
}) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.ITEM,
    drop: ({ item }) => {
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
      <div className="bg-white p-3 rounded-lg text-gray-800 text-sm">
        선택된 유닛이 없습니다.
      </div>
    );
  }

  const unitBorderColor = COST_COLORS[selectedUnit.cost] || COST_COLORS[1];

  return (
    <div className="bg-white p-3 rounded-lg text-gray-800 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
            <img 
                src={selectedUnit.tileIcon} 
                alt={selectedUnit.name} 
                className="w-12 h-12 rounded-md" 
                style={{ border: `2px solid ${unitBorderColor}`}}
            />
            <div>
                <h2 className="text-lg font-bold">{selectedUnit.name}</h2>
                <div>
                    {[1, 2, 3].map(star => (
                    <span
                        key={star}
                        className={
                        selectedUnit.star >= star
                            ? 'text-yellow-300'
                            : 'text-gray-600'
                        }
                        style={{ cursor: 'pointer', fontSize: '1.2rem' }}
                        onClick={() => onChangeStar(selectedUnit.pos, star)}
                    >
                        ★
                    </span>
                    ))}
                </div>
            </div>
        </div>
        <button
          onClick={() => onUnitRemove(selectedUnit.pos)}
          className="text-red-400 hover:text-red-600 text-xl font-bold"
          title="유닛 제거"
        >
          ×
        </button>
      </div>

      <div className="text-base font-semibold">장착 아이템</div>
      {/* 추천 아이템 섹션 */}
      <div>
        <div className="text-base font-semibold mb-1">추천 아이템</div>
        <div className="flex flex-col gap-1.5">
          {(selectedUnit.recommendedItems || []).slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center bg-gray-100 p-1 rounded">
              <img src={item.icon} alt={item.name} className="w-8 h-8 rounded" />
              <div className="ml-2 flex-grow">
                <div className="text-sm font-semibold text-gray-800">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">평균 등수</div>
                <div className="text-sm font-bold text-brand-mint">#{item.avgPlacement.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {(selectedUnit.recommendedItems || []).length === 0 && (
            <div className="text-xs text-gray-500">추천 아이템 정보가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}