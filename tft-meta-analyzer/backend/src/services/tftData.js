import axios from 'axios';

let tftData = null;
const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';

// 데이터를 한번만 로딩하여 메모리에 캐싱하는 싱글톤 패턴
const getTFTData = async () => {
  if (tftData) {
    return tftData;
  }
  try {
    console.log('TFT 데이터 서비스를 초기화합니다. 데이터를 한 번만 불러옵니다...');
    const response = await axios.get(TFT_DATA_URL);
    const sets = response.data.sets;
    // 가장 마지막 세트 번호를 동적으로 찾습니다.
    const currentSet = Object.keys(sets).sort((a, b) => parseInt(b) - parseInt(a))[0];
    
    tftData = {
      items: response.data.items,
      champions: sets[currentSet].champions,
      traits: sets[currentSet].traits,
      currentSet: currentSet,
    };
    
    console.log(`TFT 데이터 서비스 초기화 완료! (현재 시즌: ${currentSet})`);
    return tftData;
  } catch (error) {
    console.error('TFT 데이터 서비스 초기화 실패:', error.message);
    return null;
  }
};

export default getTFTData;