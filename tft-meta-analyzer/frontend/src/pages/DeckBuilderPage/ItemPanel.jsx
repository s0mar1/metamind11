import React, { useMemo } from 'react';
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
        cursor: 'move',
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
  // useTFTData에서 items와 augments를 가져옴
  const { items: allItems, augments: allAugments, loading } = useTFTData();

  const categorizedItems = useMemo(() => {
    const basicItems = [];      // 기본 재료 아이템 (ex: 곡궁, 갑옷)
    const completedItems = [];  // 완성 아이템 (ex: 피바라기, 무한의 대검)
    const ornnItems = [];       // 오른 아이템 (유물 아이템)
    const radiantItems = [];    // 찬란한 아이템
    const emblemItems = [];     // 상징 아이템 (특성 부여 아이템)
    const unknownItems = [];    // 분류되지 않은 아이템 (디버깅용)
    
    if (allItems) {
      allItems.forEach(item => {
        const apiName = item.apiName?.toLowerCase();
        const iconPath = item.icon?.toLowerCase();

        // 1. 오른 아이템 (isUnique=true, Ornn 관련 apiName/iconPath)
        // Set11에서는 'TFT11_Item_Artifact_'로 시작하는 apiName이 많음
        if (item.isUnique && (apiName.includes('ornn') || apiName.includes('artifact') || iconPath.includes('ornn'))) {
            ornnItems.push(item);
        } 
        // 2. 찬란한 아이템 (apiName에 'Radiant' 또는 'Hyper' 포함)
        else if (apiName.includes('radiant') || apiName.includes('hyper')) {
            radiantItems.push(item);
        }
        // 3. 상징 아이템 (associatedTraits 필드 존재 또는 apiName/iconPath에 'Emblem' 포함)
        // Community Dragon 데이터의 item.associatedTraits 필드가 가장 정확한 기준
        else if (item.associatedTraits && item.associatedTraits.length > 0) {
            emblemItems.push(item);
        } else if (apiName.includes('emblem') || iconPath.includes('emblems')) {
            emblemItems.push(item);
        }
        // 4. 기본 재료 아이템 (apiName이 'TFT_Item_Component_'로 시작)
        else if (apiName.startsWith('tft_item_component_')) {
            basicItems.push(item);
        }
        // 5. 완성 아이템 (composition 필드가 있고 비어있지 않거나, 기본 아이템, 오른, 찬란, 상징이 아닌 경우)
        else if (item.composition && item.composition.length > 0) {
            completedItems.push(item);
        }
        // 6. 그 외 분류되지 않은 아이템 (디버깅용)
        else {
            // console.log("아이템 분류 실패:", item.name, item.apiName); // 디버깅 로그
            unknownItems.push(item);
        }
      });
    }

    return {
      basicItems,       // 재료 아이템
      completedItems,   // 완성 아이템
      ornnItems,        // 오른 아이템
      radiantItems,     // 찬란한 아이템
      emblemItems,      // 상징 아이템
      augments: allAugments, // 증강체
      unknownItems,     // 분류되지 않은 아이템 (UI에는 표시하지 않을 수 있음)
    };
  }, [allItems, allAugments]);

  if (loading) {
    return <div className="text-gray-300">아이템 목록 로딩 중...</div>;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white space-y-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold">아이템</h2>

      <section>
        <h3 className="font-semibold mb-2">기본 아이템 (재료)</h3>
        <div className="flex flex-wrap">
          {categorizedItems.basicItems.length > 0
            ? categorizedItems.basicItems.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400 text-sm">재료 아이템이 없습니다.</p>
          }
        </div>
      </section>
      
      <section>
        <h3 className="font-semibold mb-2">완성 아이템</h3>
        <div className="flex flex-wrap">
          {categorizedItems.completedItems.length > 0
            ? categorizedItems.completedItems.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400 text-sm">완성 아이템이 없습니다.</p>
          }
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">오른 아이템 (유물)</h3>
        <div className="flex flex-wrap">
          {categorizedItems.ornnItems.length > 0
            ? categorizedItems.ornnItems.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400 text-sm">오른 아이템이 없습니다.</p>
          }
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">찬란한 아이템</h3>
        <div className="flex flex-wrap">
          {categorizedItems.radiantItems.length > 0
            ? categorizedItems.radiantItems.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400 text-sm">찬란한 아이템이 없습니다.</p>
          }
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">상징 아이템</h3>
        <div className="flex flex-wrap">
          {categorizedItems.emblemItems.length > 0
            ? categorizedItems.emblemItems.map(item => (
                <DraggableItem key={item.apiName} item={item} />
              ))
            : <p className="text-gray-400 text-sm">상징 아이템이 없습니다.</p>
          }
        </div>
      </section>
      
      <section>
        <h3 className="font-semibold mb-2">증강체</h3>
        <div className="flex flex-wrap">
          {categorizedItems.augments.length > 0
            ? categorizedItems.augments.map(aug => (
                <DraggableItem key={aug.apiName} item={aug} />
              ))
            : <p className="text-gray-400 text-sm">증강체가 없습니다.</p>
          }
        </div>
      </section>

      {/* 디버깅용: 분류되지 않은 아이템이 있다면 표시 */}
      {categorizedItems.unknownItems.length > 0 && (
          <section>
              <h3 className="font-semibold mb-2 text-red-400">분류되지 않은 아이템 (확인 필요)</h3>
              <div className="flex flex-wrap">
              {categorizedItems.unknownItems.map(item => (
                  <DraggableItem key={item.apiName} item={item} />
              ))}
              </div>
          </section>
      )}
    </div>
  );
}