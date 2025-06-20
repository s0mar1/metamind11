// backend/src/services/tftData.js

import axios from 'axios';

let tftData = null;

const EN_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';
const KR_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';

const CDN_URL_PLUGINS_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
const CDN_URL_GAME_BASE = 'https://raw.communitydragon.org/latest/game/';

export const IDX2KEY = ['inactive', 'bronze', 'silver', 'gold', 'prismatic'];
export const STYLE_ORDER = { inactive: 0, bronze: 1, silver: 2, gold: 3, prismatic: 4, chromatic: 5 };

export const PALETTE = {
  bronze   : '#B06A49',
  silver   : '#D0D6D9',
  gold     : '#E6C68C',
  prismatic: '#FFFFFF',
  unique   : '#FFA773',
  inactive : '#6C757D',
};

// 💡 수정: toPNG 함수에서 _tft_setXX 패턴 제거 로직 삭제 (원본 경로를 유지)
const toPNG = (path) => {
  if (!path) return null;
  let lowerPath = path.toLowerCase();

  // .tex 또는 .dds 확장자를 .png로 변경
  if (lowerPath.endsWith('.tex') || lowerPath.endsWith('.dds')) {
    lowerPath = lowerPath.replace(/\.(tex|dds)$/, '.png');
  }

  // 파일 확장자가 없는 경우 .png 추가 (다른 유효한 확장자가 없는 경우에만)
  const lastDotIndex = lowerPath.lastIndexOf('.');
  const lastSlashIndex = lowerPath.lastIndexOf('/');
  if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex) {
      if (!lowerPath.endsWith('.png') && !lowerPath.endsWith('.jpg') && !lowerPath.endsWith('.jpeg') && !lowerPath.endsWith('.gif')) {
          lowerPath = `${lowerPath}.png`;
      }
  }

  // 💡 핵심: 제공된 아이템/증강체 경로 패턴에 맞춰 CDN_URL_GAME_BASE 사용
  // /game/assets/maps/tft/icons/... 패턴을 따르는지 확인
  if (lowerPath.includes('assets/maps/tft/icons/')) {
    const processedPath = lowerPath.substring(lowerPath.indexOf('assets/maps/tft/icons/'));
    return `${CDN_URL_GAME_BASE}${processedPath}`;
  }
  // 그 외 챔피언 tileIcon 등 다른 플러그인 베이스를 따르는 경로
  else if (lowerPath.startsWith('/lol-game-data/assets/')) {
    const processedPath = lowerPath.substring('/lol-game-data/assets/'.length);
    return `${CDN_URL_PLUGINS_BASE}assets/${processedPath}`;
  } else if (lowerPath.startsWith('assets/')) {
    const processedPath = lowerPath.substring('assets/'.length);
    return `${CDN_URL_PLUGINS_BASE}assets/${processedPath}`;
  }
  else if (lowerPath.startsWith('characters/') || lowerPath.startsWith('v1/champion-icons/')) {
    return `${CDN_URL_PLUGINS_BASE}${lowerPath}`;
  }
  // `maps/`로 시작하지만 `tft/icons` 포함하지 않는 다른 경우
  else if (lowerPath.startsWith('maps/')) {
    // `assets/`가 이미 제거된 후 `maps/`로 시작하는 경우
    return `${CDN_URL_GAME_BASE}assets/${lowerPath}`;
  }
  else {
    // Unrecognized path pattern for: ASSETS/ ... (예외 처리)
    console.warn(`WARN_TOPNG: Unrecognized path pattern for: ${path}. Attempting default plugins/assets/ base.`);
    return `${CDN_URL_PLUGINS_BASE}assets/${lowerPath}`;
  }
};

export const getTraitStyleInfo = (traitApiName, currentUnitCount, tftStaticData) => { /* ... 변동 없음 ... */ };

const getTFTData = async () => {
  if (tftData) {
    return tftData;
  }
  try {
    console.log('TFT 데이터 서비스를 초기화합니다...');
    
    const [enResponse, krResponse] = await Promise.all([
      axios.get(EN_URL),
      axios.get(KR_URL)
    ]);

    const enData = enResponse.data;
    const rawKrData = krResponse.data;
    
    const currentSetKey = Object.keys(enData.sets).sort((a, b) => parseInt(b) - parseInt(a))[0];
    const enSetData = enData.sets[currentSetKey];
    const krSetData = rawKrData.sets[currentSetKey];

    const krChampionNames = new Map(krSetData.champions.map(c => [c.apiName, c.name]));
    // 💡 수정: krTraitNames 맵핑 오타 수정 (`c` -> `t`)
    const krTraitNames = new Map(krSetData.traits.map(t => [t.apiName, t.name]));
    const krItemNames = new Map();
    enData.items.forEach(enItem => {
        const krFoundItem = rawKrData.items.find(krIt => krIt.apiName === enItem.apiName);
        if (krFoundItem) {
            krItemNames.set(enItem.apiName, krFoundItem.name);
        } else {
            krItemNames.set(enItem.apiName, enItem.name);
        }
    });

    const champions = enSetData.champions
        .filter(champ => champ.cost > 0 && champ.traits.length > 0 && !champ.apiName.includes('Tutorial'))
        .map(champ => {
            return {
                ...champ,
                name: krChampionNames.get(champ.apiName) || champ.name,
                tileIcon: toPNG(champ.tileIcon) 
            };
        });

    const traitMap = new Map();
    enSetData.traits.forEach(trait => {
        const krName = krTraitNames.get(trait.apiName);
        if (krName) {
            trait.name = krName;
        }
        trait.icon = toPNG(trait.icon); 
        traitMap.set(trait.apiName.toLowerCase(), trait);
    });

    // 💡 핵심 수정: 아이템 로딩 및 분류 로직 강화 (제공된 표 기반)
    const basicItems = [];
    const completedItems = [];
    const ornnItems = [];
    const radiantItems = [];
    const emblemItems = [];
    const supportItems = []; // 💡 추가: 지원 아이템 카테고리
    const robotItems = [];   // 💡 추가: 골렘/봇 아이템 카테고리
    const processedAugments = []; // 증강체

    enData.items.forEach(item => {
        const apiName = item.apiName?.toLowerCase();
        const iconPath = item.icon?.toLowerCase();

        // 1. 기본 필터링 (불필요/깨지는 아이템 제외)
        // Set14 데이터 기반, 제공해주신 표에 없는 또는 명백히 문제있는 아이템 필터링
        if (
            !item.icon || // 아이콘 경로 없는 경우
            iconPath.includes('_placeholder') || iconPath.includes('_debug') || iconPath.includes('_test') ||
            apiName.includes('_debug_') || apiName.includes('_test_') || apiName.includes('_placeholder_') ||
            apiName.includes('trainingdummy') || apiName.includes('unstableconcoction') ||
            // 이전 세트 아이템 필터링: composition 없고, 증강체도 유니크도 아닌 _setXX_ 아이템만 거름 (표에 없는 항목)
            (apiName.includes('_set') && !apiName.includes('_set' + currentSetKey + '_') && !item.composition?.length && item.type !== 'Augment' && !item.isUnique && !(item.associatedTraits && item.associatedTraits.length > 0))
        ) {
            return;
        }

        const krName = krItemNames.get(item.apiName);
        const processedItem = {
            ...item,
            name: krName || item.name,
            icon: toPNG(item.icon) // 아이콘 경로 toPNG 처리
        };

        // 2. 증강체 분류 (가장 먼저 분리)
        if (iconPath.includes('augments/') || apiName.includes('augments') || item.type === 'Augment') {
            processedAugments.push(processedItem);
            return;
        }

        // 3. 제공된 표의 분류 기준에 따라 아이템 분류
        if (iconPath.includes('items/components/')) { // 조각(컴포넌트) 아이템
            basicItems.push(processedItem);
        } else if (iconPath.includes('items/radiant/')) { // 찬란한 아이템
            radiantItems.push(processedItem);
        } else if (iconPath.includes('items/artifacts/') || apiName.includes('ornn') || apiName.includes('artifact')) { // 유물(Ornn Artifact) 아이템
            ornnItems.push(processedItem);
        } else if (iconPath.includes('items/emblems/') || (item.associatedTraits && item.associatedTraits.length > 0)) { // 상징 아이템
            emblemItems.push(processedItem);
        } else if (iconPath.includes('items/special/support/')) { // 지원(Team-Boost) 아이템
            supportItems.push(processedItem);
        } else if (
            // 골렘 및 봇 아이템 (apiName으로 명확히 구분)
            apiName.includes('corruptedchassis') || apiName.includes('cybercoil') || apiName.includes('fluxcapacitor') ||
            apiName.includes('holobow') || apiName.includes('hyperfangs') || apiName.includes('pulsestabilizer') ||
            apiName.includes('repulsorlantern') || apiName.includes('tft_item_corruptedchassis') || apiName.includes('tft_item_cybercoil') ||
            apiName.includes('tft_item_fluxcapacitor') || apiName.includes('tft_item_holobow') || apiName.includes('tft_item_hyperfangs') ||
            apiName.includes('tft_item_pulsestabilizer') || apiName.includes('tft_item_repulsorlantern')
        ) {
            robotItems.push(processedItem);
        } else if (item.composition && item.composition.length > 0) { // 조합식이 있는 완성 아이템
            completedItems.push(processedItem);
        } else if (apiName.startsWith('tft_item_') && !apiName.includes('_component_') && item.goldValue > 0) {
            // apiName이 tft_item_으로 시작하고 재료가 아니며 goldValue가 있는 경우 (나머지 완성템)
            completedItems.push(processedItem);
        }
        else {
            // 위 분류에 해당하지 않는 아이템은 일단 완성 아이템으로 간주 (fallback)
            // console.warn('tftData: Item not categorized (fallback to completed):', item.name, item.apiName, iconPath);
            completedItems.push(processedItem);
        }
    });

    tftData = {
      items: { // 💡 수정: 분류된 아이템들을 반환
        basic: basicItems,
        completed: completedItems,
        ornn: ornnItems,
        radiant: radiantItems,
        emblem: emblemItems,
        support: supportItems, // 💡 추가: 지원 아이템
        robot: robotItems,     // 💡 추가: 골렘/봇 아이템
      },
      augments: processedAugments, // 증강체
      champions: champions,
      traitMap: traitMap,
      currentSet: `Set${currentSetKey}`,
      krNameMap: new Map([
        ...Array.from(krChampionNames.entries()).map(([key, value]) => [key.toLowerCase(), value]),
        ...Array.from(krTraitNames.entries()).map(([key, value]) => [key.toLowerCase(), value]),
        ...Array.from(krItemNames.entries()).map(([key, value]) => [key.toLowerCase(), value])
      ])
    };
    
    console.log(`TFT 데이터 초기화 완료! (시즌: ${tftData.currentSet}, 챔피언 ${tftData.champions.length}개, 아이템 ${tftData.items.length}개, 증강체 ${tftData.augments.length}개)`);
    return tftData;

  } catch (error) {
    console.error(`TFT 데이터 서비스 초기화 실패: ${error.message}`);
    tftData = null;
    return null;
  }
};

export default getTFTData;