// frontend/src/context/TFTDataContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const TFTDataContext = createContext();

export const useTFTData = () => useContext(TFTDataContext);

export const TFTDataProvider = ({ children }) => {
  // 💡 1. 덱 빌더용으로 분류된 아이템을 저장할 새로운 상태 추가
  const [itemsByCategory, setItemsByCategory] = useState({});

  // 기존 tftData 상태 (다른 페이지에서 사용하므로 그대로 유지합니다)
  const [tftData, setTftData] = useState({
    champions: [],
    items: { basic: [], completed: [], ornn: [], radiant: [], emblem: [], support: [], robot: [], unknown: [] },
    augments: [],
    traits: [],
    traitMap: new Map(),
    krNameMap: new Map(),
    currentSet: '',
  });

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
        // 💡 2. Promise.all을 사용해 두 API를 병렬로 호출하여 성능을 최적화합니다.
        const [tftMetaResponse, itemsByCategoryResponse] = await Promise.all([
          axios.get('/api/static-data/tft-meta'), // 기존 데이터 (전적 페이지 등에서 사용)
          axios.get('/api/static-data/items-by-category') // 새로 추가된 분류된 아이템 데이터 (덱 빌더에서 사용)
        ]);

        if (tftMetaResponse.status !== 200) {
          throw new Error(tftMetaResponse.data.error || `HTTP error! status: ${tftMetaResponse.status}`);
        }
        if (itemsByCategoryResponse.status !== 200) {
          throw new Error(itemsByCategoryResponse.data.error || `HTTP error! status: ${itemsByCategoryResponse.status}`);
        }
        
        // 각 API 응답 결과를 상태에 저장합니다.
        setTftData(tftMetaResponse.data);
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

  const showTooltip = (championData, event) => {
    setTooltip({
      visible: true,
      data: championData,
      position: { x: event.clientX + 15, y: event.clientY + 15 }
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const value = {
    ...tftData,        // 기존 tftData도 그대로 제공하여 다른 페이지에 영향을 주지 않음
    itemsByCategory,   // 💡 3. 새로 추가된 아이템 데이터를 context 값으로 전달
    loading,
    error,
    tooltip,
    showTooltip,
    hideTooltip,
  };

  return (
    <TFTDataContext.Provider value={value}>
      {children}
    </TFTDataContext.Provider>
  );
};