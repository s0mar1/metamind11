// backend/src/services/tftData.js
import axios from 'axios';

let tftData = null;
const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';
const CDN_BASE_URL = 'https://raw.communitydragon.org/latest/game/';

async function loadTFTData() {
  if (tftData) return tftData; 
  try {
    console.log('(TFT Data Service) 최신 TFT 데이터를 불러오는 중입니다...');
    const response = await axios.get(TFT_DATA_URL);
    const currentSet = '14'; // 현재 TFT 세트 번호 (필요에 따라 업데이트)
    tftData = {
      items: response.data.items,
      champions: response.data.sets[currentSet].champions,
      traits: response.data.sets[currentSet].traits,
      currentSet: currentSet, // 🚨 NEW: tftData 객체에 currentSet 추가
    };
    console.log(`(TFT Data Service) TFT 시즌 ${currentSet} 데이터 로딩 성공!`);
    return tftData;
  } catch (error) {
    console.error('(TFT Data Service) TFT 데이터 로딩 실패:', error.message);
    throw new Error('TFT 데이터 로딩 실패');
  }
}

function getCDNImageUrl(iconPath) {
    if (!iconPath) return null;
    return `${CDN_BASE_URL}${iconPath.toLowerCase().replace('.tex', '.png')}`;
}

export { loadTFTData, getCDNImageUrl };