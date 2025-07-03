import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTFTData } from '../../context/TFTDataContext';

import UnitPanel from './UnitPanel';
import SynergyPanel from './SynergyPanel';
import HexGrid from './HexGrid';
import ItemPanel from './ItemPanel';
import DetailPanel from './DetailPanel';

import { useNavigate } from 'react-router-dom';

export default function DeckBuilderPage() {
  const { champions, loading } = useTFTData(); // `items`, `augments`, `traits`는 직접 사용하지 않으므로 제거, `loading` 추가
  const [placedUnits, setPlacedUnits] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const navigate = useNavigate();

  const handleUnitAction = useCallback((draggedItem, targetPos) => {
    const toKey = `${targetPos.y}-${targetPos.x}`;
    setPlacedUnits(prev => {
      const next = { ...prev };
      const apiName = draggedItem.championApiName || draggedItem.unit?.apiName;
      const fromKey = draggedItem.fromKey;

      if (fromKey === toKey) {
        setSelectedKey(toKey);
        return prev;
      }

      if (fromKey && next[fromKey]) delete next[fromKey];
      if (next[toKey] && next[toKey].apiName !== apiName) delete next[toKey];

      const fullUnitData = champions.find(c => c.apiName === apiName);
      if (!fullUnitData) {
        return prev;
      }

      next[toKey] = {
        ...fullUnitData,
        pos: { x: targetPos.x, y: targetPos.y },
        star: fromKey && prev[fromKey] ? prev[fromKey].star : draggedItem.unit?.star || 1,
        items: fromKey && prev[fromKey] ? prev[fromKey].items : draggedItem.unit?.items || [],
      };
      return next;
    });
    setSelectedKey(toKey);
  }, [champions]);

  const handleUnitRemove = useCallback(pos => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (selectedKey === key) setSelectedKey(null);
  }, [selectedKey]);

  const handleSelectUnit = useCallback(pos => {
    const key = `${pos?.y}-${pos?.x}`;
    if (pos && !placedUnits[key]) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(prev => (prev === key ? null : key));
  }, [placedUnits]);

  const handleChangeStar = useCallback((pos, star) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      return { ...prev, [key]: { ...unit, star } };
    });
  }, []);

  const handleEquip = useCallback((pos, item) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      const existing = unit.items || [];
      if (existing.some(i => i.apiName === item.apiName)) return prev;
      if (existing.length >= 3) return prev;
      return { ...prev, [key]: { ...unit, items: [...existing, item] } };
    });
  }, []);

  const handleUnequip = useCallback((pos, itemToRemove) => {
    const key = `${pos.y}-${pos.x}`;
    setPlacedUnits(prev => {
      const unit = prev[key];
      if (!unit) return prev;
      return { ...prev, [key]: { ...unit, items: (unit.items || []).filter(i => i.apiName !== itemToRemove.apiName) } };
    });
  }, []);

  const handleCreateGuide = useCallback(() => {
    navigate('/guides/new', { state: { initialDeck: placedUnits } });
  }, [navigate, placedUnits]);

  const selectedUnit = selectedKey ? placedUnits[selectedKey] : null;
  const unitsForSynergy = useMemo(() => {
    const units = Object.values(placedUnits);
    return units;
  }, [placedUnits]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col min-h-[calc(100vh-theme(space.16))] bg-background-base p-4 lg:p-6 relative z-0">
        <div className="bg-white p-4 rounded-lg text-gray-800 mb-4 shadow-md z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">덱 빌더</h2>
            <button
              onClick={handleCreateGuide}
              className="bg-brand-mint hover:bg-brand-mint text-white px-4 py-2 rounded text-sm font-semibold"
            >
              공략 작성
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[180px_minmax(720px,1fr)_240px] gap-5 mb-4 flex-grow">
          <aside className="bg-white p-4 rounded-lg shadow-md h-full z-10"><SynergyPanel placedUnits={unitsForSynergy} /></aside>
          <main className="flex-grow flex justify-center items-center bg-white rounded-lg p-4 shadow-md z-10"><HexGrid placedUnits={placedUnits} onUnitAction={handleUnitAction} onSelectUnit={handleSelectUnit} onUnitRemove={handleUnitRemove} onItemDrop={handleEquip} selectedKey={selectedKey} /></main>
          <aside className="bg-white p-4 rounded-lg shadow-md h-full z-10"><DetailPanel selectedUnit={selectedUnit} onUnitRemove={handleUnitRemove} onChangeStar={handleChangeStar} onEquip={handleEquip} onUnequip={handleUnequip} /></aside>
        </div>

        <div className="grid grid-cols-12 gap-5">
              <div className="col-span-8 bg-white p-4 rounded-lg shadow-md"><UnitPanel /></div>
              <div className="col-span-4 bg-white p-4 rounded-lg shadow-md"><ItemPanel /></div>
            </div>
      </div>
    </DndProvider>
  );
}
