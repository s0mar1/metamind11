import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';

const TFTDataContext = createContext();

export const useTFTData = () => useContext(TFTDataContext);

export const TFTDataProvider = ({ children }) => {
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [tftData, setTftData] = useState({
    champions: [],
    items: { basic: [], completed: [], ornn: [], radiant: [], emblem: [], support: [], robot: [], unknown: [] },
    augments: [],
    traits: [],
    traitMap: new Map(),
    krNameMap: new Map(),
    currentSet: '',
  });

  const allItems = useMemo(() => {
    if (!itemsByCategory) return [];
    return Object.values(itemsByCategory).flat();
  }, [itemsByCategory]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tftMetaResponse, itemsByCategoryResponse] = await Promise.all([
          axios.get('/api/static-data/tft-meta'),
          axios.get('/api/static-data/items-by-category')
        ]);

        const receivedTftData = tftMetaResponse.data;

        // 💡 핵심 수정: 백엔드에서 [key, value] 배열로 받은 traitMap과 krNameMap을 다시 Map 객체로 재구성합니다.
        const rehydratedTraitMap = new Map(receivedTftData.traitMap);
        const rehydratedKrNameMap = new Map(receivedTftData.krNameMap);

        // 💡 핵심 수정: traitMap의 [key, value]를 모두 사용하여 각 trait 객체에 apiName을 주입합니다.
        const extractedTraits = Array.from(rehydratedTraitMap.entries()).map(([apiName, traitData]) => ({
          ...traitData,
          apiName: apiName, 
        }));

        setTftData({
          ...receivedTftData,
          traits: extractedTraits, // 추출된 traits 배열을 추가
          traitMap: rehydratedTraitMap, // 재구성된 Map 객체 할당
          krNameMap: rehydratedKrNameMap, // 재구성된 Map 객체 할당
        });
        setItemsByCategory(itemsByCategoryResponse.data);

      } catch (error) {
        console.error("TFT 데이터 로딩 실패:", error);
        setError(error.response?.data?.error || error.message || "데이터 로딩 중 알 수 없는 오류 발생");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showTooltip = useCallback((data, event) => {
    const tooltipWidth = 320; // 툴팁의 가로 너비 (w-80)
    const x = event.clientX + 15 + tooltipWidth > window.innerWidth
      ? event.clientX - tooltipWidth - 15
      : event.clientX + 15;
    const y = event.clientY + 15;

    setTooltip({
      visible: true,
      data: data,
      position: { x, y }
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const value = useMemo(() => ({
    ...tftData,
    itemsByCategory,
    allItems,
    loading,
    error,
    tooltip,
    showTooltip,
    hideTooltip,
  }), [tftData, itemsByCategory, allItems, loading, error, tooltip, showTooltip, hideTooltip]);

  return (
    <TFTDataContext.Provider value={value}>
      {children}
    </TFTDataContext.Provider>
  );
};