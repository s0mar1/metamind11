import React from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants';
import { useTFTData } from '../../context/TFTDataContext'; // 💡 1. 툴팁 함수 사용을 위해 import

// ─────────────────────────────────────────────────────────────
//  HEX + BORDER  ★  clip‑path polygon helpers
// ─────────────────────────────────────────────────────────────
const HEX_CLIP = [
  '50% 0%',
  '100% 25%',
  '100% 75%',
  '50% 100%',
  '0% 75%',
  '0% 25%',
].join(',');

const COST_COLORS = {
  1: '#808080',
  2: '#1E823C',
  3: '#156293',
  4: '#87259E',
  5: '#B89D29',
};

export default function HexGrid({
  placedUnits,
  onUnitAction,
  onSelectUnit,
  onUnitRemove,
  onItemDrop, // Add onItemDrop prop
  selectedKey,
}) {
  const ROWS = 5;
  const COLS = 7;
  const CELL = { w: 80, h: 92 };
  const SPACING = 8;

  const WIDTH = COLS * (CELL.w + SPACING) + CELL.w / 2;
  const HEIGHT = ROWS * ((CELL.h * 0.75) + SPACING) + CELL.h * 0.25;

  const coords = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) coords.push({ x, y });
  }

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {coords.map(({ x, y }) => (
        <HexCell
          key={`${y}-${x}`}
          x={x}
          y={y}
          CELL={CELL}
          SPACING={SPACING}
          onUnitAction={onUnitAction}
        />
      ))}

      {Object.entries(placedUnits).map(([key, unit]) => {
        const [y, x] = key.split('-').map(Number);
        return (
          <PlacedUnit
            key={key}
            unit={unit}
            pos={{ x, y }}
            CELL={CELL}
            SPACING={SPACING}
            isSelected={key === selectedKey}
            onUnitAction={onUnitAction}
            onSelectUnit={onSelectUnit}
            onUnitRemove={onUnitRemove}
            onItemDrop={onItemDrop}
          />
        );
      })}
    </div>
  );
}

function HexCell({ x, y, CELL, SPACING, onUnitAction }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.UNIT, ItemTypes.PLACED_UNIT],
    drop: (item) => {
      const championApiName = item.championApiName || item.unit?.apiName;
      onUnitAction({ championApiName, fromKey: item.fromKey, unit: item.unit }, { x, y });
    },
    collect: (m) => ({ isOver: m.isOver({ shallow: true }), canDrop: m.canDrop() }),
  });

  const offsetX = y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left = x * (CELL.w + SPACING) + offsetX;
  const top = y * ((CELL.h * 0.75) + SPACING);

  const borderColor = isOver && canDrop ? '#ffd700' : '#1f2937';

  return (
    <div ref={drop} className="absolute" style={{ left, top, width: CELL.w, height: CELL.h }}>
      <div
        className="w-full h-full"
        style={{
          clipPath: `polygon(${HEX_CLIP})`,
          backgroundColor: borderColor, /* 테두리 색상 */
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          className="w-[calc(100%-4px)] h-[calc(100%-4px)]" /* 4px는 테두리 두께 */
          style={{
            clipPath: `polygon(${HEX_CLIP})`,
            backgroundColor: '#E0E0E0', /* 육각형 셀 배경색 */
          }}
        />
      </div>
    </div>
  );
}

function PlacedUnit({
  unit,
  pos,
  CELL,
  SPACING,
  isSelected,
  onUnitAction,
  onSelectUnit,
  onUnitRemove,
  onItemDrop, // Add onItemDrop prop
}) {
  const { showTooltip, hideTooltip } = useTFTData();
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PLACED_UNIT,
    item: { unit, fromKey: `${pos.y}-${pos.x}` },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  // Make PlacedUnit a drop target for items
  const [{ isOver: isOverItem, canDrop: canDropItem }, dropItem] = useDrop({
    accept: ItemTypes.ITEM,
    drop: (item) => {
      onItemDrop(pos, item.item); // Call onItemDrop with unit position and dropped item
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const offsetX = pos.y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left = pos.x * (CELL.w + SPACING) + offsetX;
  const top = pos.y * ((CELL.h * 0.75) + SPACING);

  const BORDER = 3;
  const cost = Number(unit.cost) || 1;
  const borderColor = COST_COLORS[cost];

  return (
    <div
      ref={node => drag(dropItem(node))}
      className={`absolute cursor-pointer ${isOverItem && canDropItem ? 'ring-4 ring-yellow-400' : ''}`}
      onClick={() => onSelectUnit(pos)}
      onContextMenu={(e) => {
        e.preventDefault();
        onUnitRemove(pos);
      }}
      onMouseEnter={(e) => showTooltip(unit, e)}
      onMouseLeave={hideTooltip}
      style={{
        left,
        top,
        width: CELL.w,
        height: CELL.h,
        opacity: isDragging ? 0.5 : 1,
        zIndex: 10,
      }}
    >
      {/* 챔피언 이미지 (잘림 효과 적용) */}
      <div
        className="w-full h-full"
        style={{
          clipPath: `polygon(${HEX_CLIP})`,
          background: borderColor,
        }}
      >
        <div
          className="w-full h-full"
          style={{
            clipPath: `polygon(${HEX_CLIP})`,
            transform: `scale(${(CELL.w - BORDER * 2) / CELL.w})`,
            transformOrigin: 'center',
          }}
        >
          <img
            src={unit.tileIcon}
            alt={unit.name}
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      </div>

      {/* 별 아이콘 (잘림 효과 없음) */}
      {unit.star > 0 && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-px text-yellow-300 text-base font-bold"
          style={{ textShadow: '0 0 2px black', zIndex: 20 }}
        >
          {'★'.repeat(unit.star)}
        </div>
      )}

      {/* 아이템 아이콘 (잘림 효과 없음) */}
      {unit.items && unit.items.length > 0 && (
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center gap-px"
          style={{ zIndex: 20 }}
        >
          {unit.items.slice(0, 3).map(
            (item, idx) =>
              item.icon && (
                <img
                  key={idx}
                  src={item.icon}
                  alt={item.name}
                  className="w-5 h-5 rounded-sm"
                  title={item.name}
                />
              ),
          )}
        </div>
      )}
    </div>
  );
}