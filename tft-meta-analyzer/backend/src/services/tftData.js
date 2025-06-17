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
    const krItemNames = new Map(krData.items.map(i => [i.apiName, i.name])); // 아이템 한글 이름 맵 추가

    const currentSetPrefix = `TFT${currentSetKey}_`; // 현재 시즌의 apiName 접두사 (예: TFT11_)

    // 4. 영문 데이터를 기준으로, 이름만 한글로 교체하고 불필요한 유닛을 필터링합니다.
    const champions = enSetData.champions
        .filter(champ => champ.cost > 0 && champ.traits.length > 0 && !champ.apiName.includes('Tutorial'))
        .map(champ => {
            // 💡 디버깅용 로그: 챔피언의 traits 필드 확인
            // console.log(`[DEBUG] Champion ${champ.apiName}: traits = ${JSON.stringify(champ.traits)}`);
            return {
                ...champ,
                name: krChampionNames.get(champ.apiName) || champ.name, // 한글 이름이 있으면 한글로, 없으면 영어 이름 사용
            };
        });

    const traitMap = new Map();
    enSetData.traits.forEach(trait => {
        const krName = krTraitNames.get(trait.apiName);
        if (krName) {
            trait.name = krName; // 특성 이름도 한글로 교체
        }
        traitMap.set(trait.apiName.toLowerCase(), trait);
    });

    // 💡 아이템 필터링 로직 강화: 현재 Set에 해당하는 아이템만 가져오고, 덱 빌더에서 불필요한 아이템 제외
    const items = enData.items
        .filter(item => {
            // 1. 현재 Set 접두사로 필터링 (가장 먼저)
            if (!item.apiName.startsWith(currentSetPrefix)) return false;

            // 2. 덱 빌더에서 사용하지 않을 불필요한 아이템 타입 제외
            const excludedItemApiPatterns = [
                '_Consumable_', '_ChampSpawner_', '_Poro_', '_ItemRemover_', '_Gold_', '_Shovel_', '_Tome_',
                '_Map_', '_Orb_', '_Portal_', '_Placeholder_', '_TrainingDummy_', '_Dummy_',
                '_Debug_', // 디버그 아이템
            ];
            const apiNameLower = item.apiName?.toLowerCase();
            for (const pattern of excludedItemApiPatterns) {
                if (apiNameLower?.includes(pattern.toLowerCase())) {
                    return false;
                }
            }
            return true;
        })
        .map(item => ({
            ...item,
            name: krItemNames.get(item.apiName) || item.name, // 한글 이름 적용
        }));

    // 5. 최종적으로 정제된 데이터를 tftData 변수에 저장합니다.
    tftData = {
      items: items, // ⬅️ 시즌 필터링 및 한글 이름 적용된 아이템 목록
      champions: champions, // ⬅️ 챔피언 traits 데이터가 정확히 포함되는지 확인 중요
      traitMap: traitMap,   // ⬅️ 한글 이름이 적용된 특성 Map
      currentSet: `Set${currentSetKey}`,
    };
    
    console.log(`TFT 데이터 초기화 완료! (시즌: ${tftData.currentSet}, 챔피언 ${tftData.champions.length}개, 아이템 ${tftData.items.length}개)`);
    return tftData;

  } catch (error) {
    console.error('TFT 데이터 서비스 초기화 실패:', error.message);
    tftData = null; // 실패 시 null로 유지하여 다음 요청 시 재시도하도록 함
    return null;
  }
};

export default getTFTData;