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

        // 추가 디버깅 로그
        console.log("TFTDataContext: tftMetaResponse:", tftMetaResponse);
        console.log("TFTDataContext: tftMetaResponse.data:", tftMetaResponse.data);
        console.log("TFTDataContext: itemsByCategoryResponse.data:", itemsByCategoryResponse.data);

        const receivedTftData = tftMetaResponse.data;
        console.log("TFTDataContext: Fetched TFT Meta Data (receivedTftData):", receivedTftData);
        console.log("TFTDataContext: receivedTftData.traitMap (before extraction):", receivedTftData.traitMap);

        // 💡 핵심 수정: 백엔드에서 [key, value] 배열로 받은 traitMap과 krNameMap을 다시 Map 객체로 재구성합니다.
        const rehydratedTraitMap = new Map(receivedTftData.traitMap);
        const rehydratedKrNameMap = new Map(receivedTftData.krNameMap);

        // traitMap에서 traits 배열을 추출 (Map으로 변환하기 전에)
        const extractedTraits = Array.from(rehydratedTraitMap.values()); // Map의 값들을 배열로 추출

        setTftData({
          ...receivedTftData,
          traits: extractedTraits, // 추출된 traits 배열을 추가
          traitMap: rehydratedTraitMap, // 재구성된 Map 객체 할당
          krNameMap: rehydratedKrNameMap, // 재구성된 Map 객체 할당
        });
        setItemsByCategory(itemsByCategoryResponse.data);

        // 안전하게 길이 로그 출력
        console.log(
          "TFTDataContext: Data set. Champions:",
          receivedTftData.champions ? receivedTftData.champions.length : "undefined",
          "Traits:",
          extractedTraits.length // 추출된 traits의 길이를 로그
        );

      } catch (error) {
        console.error("TFT 데이터 로딩 실패:", error);
        setError(error.response?.data?.error || error.message || "데이터 로딩 중 알 수 없는 오류 발생");
      } finally {
        setLoading(false);
        console.log("TFTDataContext: Loading set to false.");
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