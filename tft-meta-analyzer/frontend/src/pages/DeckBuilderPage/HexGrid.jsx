import React from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { ItemTypes }      from '../../constants';

// “Pointy top” 정육각형 clip-path
const HEX_CLIP = [
  '50% 0%',
  '100% 25%',
  '100% 75%',
  '50% 100%',
  '0% 75%',
  '0% 25%'
].join(',');

// 코스트별 테두리 색
const COST_COLORS = {
  1: '#808080',
  2: '#1E823C',
  3: '#156293',
  4: '#87259E',
  5: '#B89D29'
};

export default function HexGrid({
  placedUnits,
  onUnitAction,
  onSelectUnit,
  onUnitRemove,
  selectedKey
}) {
  const ROWS    = 5;
  const COLS    = 7;
  const CELL    = { w: 80, h: 92 };
  const SPACING = 8;  // 간격을 8px로 확대

  const WIDTH  = COLS * (CELL.w + SPACING) + CELL.w / 2;
  const HEIGHT = ROWS * ((CELL.h * 0.75) + SPACING) + CELL.h * 0.25;

  // 모든 셀 좌표
  const coords = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      coords.push({ x, y });
    }
  }

  return (
    <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
      {coords.map(({ x, y }) => (
        <HexCell
          key={`${y}-${x}`}
          x={x} y={y}
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
          />
        );
      })}
    </div>
  );
}

// 빈 셀 (드롭 영역)
function HexCell({ x, y, CELL, SPACING, onUnitAction }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ItemTypes.UNIT, ItemTypes.PLACED_UNIT],
    drop: item => {
      const unit = item.champion || item.unit;
      onUnitAction(unit, { x, y });
    },
    collect: m => ({
      isOver:  m.isOver({ shallow: true }),
      canDrop: m.canDrop(),
    }),
  });

  const offsetX = y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left    = x * (CELL.w + SPACING) + offsetX;
  const top     = y * ((CELL.h * 0.75) + SPACING);

  const borderColor = isOver && canDrop ? '#ffd700' : '#1f2937';

  return (
    <div
      ref={drop}
      className="absolute"
      style={{ left, top, width: CELL.w, height: CELL.h }}
    >
      <div
        className="w-full h-full"
        style={{
          clipPath:        `polygon(${HEX_CLIP})`,
          backgroundColor: '#2d323d',
          border:          `2px solid ${borderColor}`,
        }}
      />
    </div>
  );
}

// 배치된 유닛
function PlacedUnit({
  unit, pos, CELL, SPACING,
  isSelected,
  onUnitAction, onSelectUnit, onUnitRemove
}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PLACED_UNIT,
    item: { unit, fromKey: `${pos.y}-${pos.x}` },
    collect: m => ({ isDragging: m.isDragging() }),
  });

  const offsetX = pos.y % 2 ? CELL.w / 2 + SPACING / 2 : 0;
  const left    = pos.x * (CELL.w + SPACING) + offsetX;
  const top     = pos.y * ((CELL.h * 0.75) + SPACING);

  const BORDER      = 3;
  const cost        = Number(unit.cost) || 1;
  const borderColor = COST_COLORS[cost];

  return (
    <div
      ref={drag}
      className="absolute cursor-pointer"
      onClick={() => onSelectUnit(pos)}
      onContextMenu={e => {
        e.preventDefault();
        onUnitRemove(pos);
      }}
      style={{
        left, top,
        width:  CELL.w,
        height: CELL.h,
        opacity:       isDragging ? 0.5 : 1,
        clipPath:      `polygon(${HEX_CLIP})`,
        boxSizing:     'border-box',
        backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
        border:        `${BORDER}px solid ${borderColor}`,
        zIndex:        10,
      }}
    >
      <img
        src={unit.tileIcon}
        alt={unit.name}
        className="w-full h-full object-cover"
        style={{ clipPath: 'inherit' }}
      />
    </div>
  );
}
