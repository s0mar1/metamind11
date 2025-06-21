// frontend/src/context/TFTDataContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const TFTDataContext = createContext();

export const useTFTData = () => useContext(TFTDataContext);

export const TFTDataProvider = ({ children }) => {
  // 💡 수정: tftData 초기 상태를 백엔드에서 반환되는 새로운 객체 구조에 맞춤
  //    items는 객체, augments는 배열
  const [tftData, setTftData] = useState({
    champions: [],
    items: { basic: [], completed: [], ornn: [], radiant: [], emblem: [], support: [], robot: [], unknown: [] }, // items는 분류된 객체
    augments: [], // 증강체는 별도 배열
    traits: [],
    traitMap: new Map(), // Map 타입으로 초기화
    krNameMap: new Map(), // Map 타입으로 초기화
    currentSet: '', // 문자열로 초기화
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 💡 추가: 에러 상태 관리

  // 툴팁 상태 관리 (기존 유지)
  const [tooltip, setTooltip] = useState({
    visible: false,
    data: null,
    position: { x: 0, y: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 💡 수정: /api/static-data 대신 /api/tft-meta 엔드포인트 호출
        const response = await axios.get('/api/tft-meta');
        
        if (response.status !== 200) {
          throw new Error(response.data.error || `HTTP error! status: ${response.status}`);
        }
        
        // 💡 수정: 받아온 데이터를 그대로 setTftData에 설정
        setTftData(response.data);
        setError(null); // 성공 시 에러 초기화

      } catch (error) {
        console.error("TFT 정적 데이터 로딩 실패:", error);
        setError(error.response?.data?.error || error.message || "데이터 로딩 중 알 수 없는 오류 발생"); // 💡 에러 메시지 업데이트
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
    ...tftData,
    loading,
    error, // 💡 추가: error 상태도 Context 값으로 제공
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