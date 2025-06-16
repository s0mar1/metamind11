import React, { useState, useCallback } from 'react';
import { DndProvider }      from 'react-dnd';
import { HTML5Backend }     from 'react-dnd-html5-backend';
import { useTFTData }       from '../../context/TFTDataContext';

import UnitPanel    from './UnitPanel';
import SynergyPanel from './SynergyPanel';
import HexGrid      from './HexGrid';
import ItemPanel    from './ItemPanel';
import DetailPanel  from './DetailPanel';

export default function DeckBuilderPage() {
  const { champions, items, augments, traits, loading } = useTFTData();
  const [placedUnits, setPlacedUnits]   = useState({});
  const [selectedKey, setSelectedKey]   = useState(null);

  // 1) 유닛 배치 / 이동
  const handleUnitAction = useCallback((unit, to) => {
    const toKey = `${to.y}-${to.x}`;
    setPlacedUnits(prev => {
      const next = { ...prev };
      // (A) 기존 위치 삭제
      const fromKey = Object.keys(next).find(k => next[k].apiName === unit.apiName);
      if (fromKey) delete next[fromKey];
      // (B) 목표위치에 다른 유닛 있으면 삭제(교체)
      if (next[toKey] && next[toKey].apiName !== unit.apiName) {
        delete next[toKey];
      }
      // (C) 새로 배치
      next[toKey] = {
        ...unit,
        pos:  { x: to.x, y: to.y },
        star: prev[fromKey]?.star || 1,
        items: prev[fromKey]?.items || []
      };
      return next;
    });
    setSelectedKey(toKey);
  }, []);

  // 2) 우클릭으로 제거
  const handleUnitRemove = useCallback(pos => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) setSelectedKey(null);
  }, [selectedKey]);

  // 3) 클릭으로 선택/해제
  const handleSelectUnit = useCallback(pos => {
    const key = `${pos?.y}-${pos?.x}`;
    if (pos && !placedUnits[key]) return;
    setSelectedKey(prev => (prev === key ? null : key));
  }, [placedUnits]);

  // 4) 별 등급 변경
  const handleChangeStar = useCallback((pos, star) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      return { ...prev, [key]: { ...unit, star } };
    });
  }, []);

  // 5) 아이템 장착/제거
  const handleEquip = useCallback((pos, item, remove = false) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      const existing = unit.items || [];
      const nextItems = remove
        ? existing.filter(i => i.name !== item.name)
        : [...existing, item];
      return { ...prev, [key]: { ...unit, items: nextItems } };
    });
  }, []);

  const selectedUnit = selectedKey ? placedUnits[selectedKey] : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_2fr_200px] gap-6 max-w-7xl mx-auto">
          
          {/* 좌측: 시너지 위, 유닛 목록 아래 */}
          <aside className="grid grid-rows-[auto_1fr] gap-6">
            <SynergyPanel placedUnits={placedUnits} allTraits={traits} />
            <UnitPanel    champions={champions} loading={loading} />
          </aside>

          {/* 중앙: 헥사곤 배치 필드 */}
          <main className="flex justify-center items-start pt-12">
            <HexGrid
              placedUnits={placedUnits}
              onUnitAction={handleUnitAction}
              onSelectUnit={handleSelectUnit}
              onUnitRemove={handleUnitRemove}
              selectedKey={selectedKey}
            />
          </main>

          {/* 우측: 상세패널 위, 아이템패널 아래 */}
          <aside className="flex flex-col gap-6">
            <DetailPanel
              selectedUnit={selectedUnit}
              onUnitRemove={handleUnitRemove}
              onChangeStar={handleChangeStar}
              onEquip={handleEquip}
            />
            <ItemPanel
              items={items}
              augments={augments}
              onEquip={handleEquip}
            />
          </aside>

        </div>
      </div>
    </DndProvider>
  );
}
