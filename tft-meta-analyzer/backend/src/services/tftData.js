// backend/src/services/tftData.js

import axios from 'axios';

let tftData = null;

const EN_URL = 'https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json';
const KR_URL = 'https://raw.communitydragon.org/pbe/cdragon/tft/ko_kr.json';

const getTFTData = async () => {
  // 이미 데이터가 로드되었다면 캐시된 데이터를 즉시 반환
  if (tftData) {
    return tftData;
  }
  try {
    console.log('TFT 데이터 서비스를 초기화합니다...');
    
    // 1. 영문/한글 데이터를 동시에 받아옵니다.
    const [enResponse, krResponse] = await Promise.all([
      axios.get(EN_URL),
      axios.get(KR_URL)
    ]);

    const enData = enResponse.data;
    const krData = krResponse.data;
    
    // 2. 최신 시즌 키를 찾습니다. (예: "11")
    const currentSetKey = Object.keys(enData.sets).sort((a, b) => parseInt(b) - parseInt(a))[0];
    const enSetData = enData.sets[currentSetKey];
    const krSetData = krData.sets[currentSetKey];

    // 3. 한글 이름 데이터를 Map 형태로 미리 만들어둡니다. (빠른 조회를 위함)
    const krChampionNames = new Map(krSetData.champions.map(c => [c.apiName, c.name]));
    const krTraitNames = new Map(krSetData.traits.map(t => [t.apiName, t.name]));
    // (필요 시) 아이템, 증강체 등 다른 데이터도 동일한 방식으로 한글 Map을 만들 수 있습니다.

    // 4. 영문 데이터를 기준으로, 이름만 한글로 교체하고 불필요한 유닛을 필터링합니다.
    const champions = enSetData.champions
        .filter(champ => champ.cost > 0 && champ.traits.length > 0 && !champ.apiName.includes('Tutorial'))
        .map(champ => ({
            ...champ,
            name: krChampionNames.get(champ.apiName) || champ.name, // 한글 이름이 있으면 한글로, 없으면 영어 이름 사용
        }));

    const traitMap = new Map();
    enSetData.traits.forEach(trait => {
        const krName = krTraitNames.get(trait.apiName);
        if (krName) {
            trait.name = krName; // 특성 이름도 한글로 교체
        }
        traitMap.set(trait.apiName.toLowerCase(), trait);
    });

    // 5. 최종적으로 정제된 데이터를 tftData 변수에 저장합니다.
    tftData = {
      items: enData.items,
      champions: champions, // ⬅️ 한글 이름 적용 및 필터링 완료된 챔피언 목록
      traitMap: traitMap,   // ⬅️ 한글 이름이 적용된 특성 Map
      currentSet: `Set${currentSetKey}`,
    };
    
    console.log(`TFT 데이터 초기화 완료! (시즌: ${tftData.currentSet}, 챔피언 ${tftData.champions.length}개)`);
    return tftData;

  } catch (error) {
    console.error('TFT 데이터 서비스 초기화 실패:', error.message);
    tftData = null; // 실패 시 null로 유지하여 다음 요청 시 재시도하도록 함
    return null;
  }
};

export default getTFTData;