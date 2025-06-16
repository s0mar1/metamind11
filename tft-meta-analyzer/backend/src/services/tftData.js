import axios from 'axios';

let tftData = null;

const EN_URL = 'https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json';
const KR_URL = 'https://raw.communitydragon.org/pbe/cdragon/tft/ko_kr.json';

// [최종 전략] 신뢰할 수 있는 조회용 Map을 생성하는 함수
const createTraitMap = (traits) => {
  const map = new Map();
  if (traits) {
    for (const trait of traits) {
      if (trait.name) {
        // 영어 표시 이름을 소문자 키로 사용
        map.set(trait.name.toLowerCase(), trait);
      }
    }
  }
  return map;
};

const getTFTData = async () => {
  if (tftData) {
    return tftData;
  }
  try {
    console.log('TFT 데이터 서비스(최종본)를 초기화합니다...');
    
    const [enResponse, krResponse] = await Promise.all([
      axios.get(EN_URL),
      axios.get(KR_URL)
    ]);

    const enData = enResponse.data;
    const krData = krResponse.data;
    const enSets = enData.sets;
    const krSets = krData.sets;
    
    const currentSetKey = Object.keys(enSets).sort((a, b) => parseInt(b) - parseInt(a))[0];
    
    const enSetData = enSets[currentSetKey];
    const krSetData = krSets[currentSetKey];

    const krNameMap = new Map();
    if (krSetData?.traits) {
      for (const krTrait of krSetData.traits) {
        if (krTrait.apiName && krTrait.name) {
          krNameMap.set(krTrait.apiName.toLowerCase(), krTrait.name);
        }
      }
    }

    tftData = {
      items: enData.items,
      champions: enSetData.champions,
      // 원본 traits 배열 대신, 신뢰할 수 있는 조회용 Map을 제공
      traitMap: createTraitMap(enSetData.traits),
      krNameMap: krNameMap,
      currentSet: `Set${currentSetKey}`,
    };
    
    console.log(`TFT 데이터 서비스 초기화 완료! (시즌: ${tftData.currentSet}, 특성 ${tftData.traitMap.size}개 Map에 저장)`);
    return tftData;

  } catch (error) {
    console.error('TFT 데이터 서비스 초기화 실패:', error.message);
    return null;
  }
};

export default getTFTData;