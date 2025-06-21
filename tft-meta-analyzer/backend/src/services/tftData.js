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

const toPNG = (path) => {
  if (!path) return null;
  let lowerPath = path.toLowerCase();

  if (lowerPath.endsWith('.tex') || lowerPath.endsWith('.dds')) {
    lowerPath = lowerPath.replace(/\.(tex|dds)$/, '.png');
  }

  const lastDotIndex = lowerPath.lastIndexOf('.');
  const lastSlashIndex = lowerPath.lastIndexOf('/');
  if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex) {
      if (!lowerPath.endsWith('.png') && !lowerPath.endsWith('.jpg') && !lowerPath.endsWith('.jpeg') && !lowerPath.endsWith('.gif')) {
          lowerPath = `${lowerPath}.png`;
      }
  }

  if (lowerPath.includes('assets/maps/tft/icons/')) {
    const processedPath = lowerPath.substring(lowerPath.indexOf('assets/maps/tft/icons/'));
    return `${CDN_URL_GAME_BASE}${processedPath}`;
  }
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
  else if (lowerPath.startsWith('maps/')) {
    return `${CDN_URL_GAME_BASE}assets/${lowerPath}`;
  }
  else {
    console.warn(`WARN_TOPNG: Unrecognized path pattern for: ${path}. Attempting default plugins/assets/ base.`);
    return `${CDN_URL_PLUGINS_BASE}assets/${lowerPath}`;
  }
};

export const getTraitStyleInfo = (traitApiName, currentUnitCount, tftStaticData) => {
    const meta = tftStaticData.traitMap.get(traitApiName.toLowerCase());
    if (!meta) {
        return null;
    }

    let styleKey = 'inactive';
    let styleOrder = 0;
    let currentThreshold = 0;
    let nextThreshold = null;
    
    const relevantEffects = (meta.effects || [])
                                .filter(effect => effect.minUnits > 0)
                                .sort((a,b) => a.minUnits - b.minUnits);

    let activeEffectForCount = null;
    for (const effect of relevantEffects) {
        if (currentUnitCount >= effect.minUnits) {
            activeEffectForCount = effect;
        } else {
            if (nextThreshold === null) {
                nextThreshold = effect.minUnits;
            }
        }
    }

    if (activeEffectForCount) {
        currentThreshold = activeEffectForCount.minUnits;
        const rawStyleNumber = activeEffectForCount.style;

        console.log(`DEBUG_STYLE_MAPPING: Trait: ${traitApiName}, Count: ${currentUnitCount}, Raw Style Num from CD: ${rawStyleNumber}`);

        switch (rawStyleNumber) {
            case 1:
                styleKey = 'bronze';
                break;
            case 3:
                styleKey = 'silver';
                break;
            case 4:
                styleKey = 'chromatic';
                break;
            case 5:
                styleKey = 'gold';
                break;
            case 6:
                styleKey = 'prismatic';
                break;
            case 2:
                styleKey = 'inactive';
                console.warn(`WARN_STYLE_MAPPING: style:2 detected for trait ${traitApiName}. Currently treated as inactive.`);
                break;
            default:
                styleKey = 'inactive';
                console.warn(`WARN_STYLE_MAPPING: Unknown rawStyleNumber ${rawStyleNumber} for trait ${traitApiName}. Falling back to inactive.`);
                break;
        }
        console.log(`DEBUG_STYLE_MAPPING: Assigned styleKey: ${styleKey} based on Raw Style Num: ${rawStyleNumber}`);

        styleOrder = STYLE_ORDER[styleKey] || 0;
    } else {
        currentThreshold = 0;
        styleKey = 'inactive';
        styleOrder = 0;
    }
    
    const finalColor = PALETTE[styleKey] ?? PALETTE['inactive'];
    const displayName = tftStaticData.krNameMap.get(traitApiName.toLowerCase()) || meta.name;

    return {
        name: displayName,
        apiName: traitApiName,
        image_url: meta.icon || null,
        tier_current: currentUnitCount,
        currentThreshold: currentThreshold,
        nextThreshold: nextThreshold,
        style: styleKey,
        styleOrder: styleOrder,
        color: finalColor,
    };
};


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

    // 💡 핵심 수정: processedAugments 변수 초기화 추가
    const basicItems = [];
    const completedItems = [];
    const ornnItems = [];
    const radiantItems = [];
    const emblemItems = [];
    const supportItems = [];
    const robotItems = [];
    const processedAugments = []; // 💡 여기에 초기화합니다!
    const unknownItems = [];

    enData.items.forEach(item => {
        const apiName = item.apiName?.toLowerCase();
        const iconPath = item.icon?.toLowerCase();

        if (
            !item.icon ||
            iconPath.includes('_placeholder') || iconPath.includes('_debug') || iconPath.includes('_test') ||
            apiName.includes('_debug_') || apiName.includes('_test_') || apiName.includes('_placeholder_') ||
            apiName.includes('trainingdummy') || apiName.includes('unstableconcoction') ||
            (apiName.includes('_set') && !apiName.includes('_set' + currentSetKey + '_') && !item.composition?.length && item.type !== 'Augment' && !item.isUnique && !(item.associatedTraits && item.associatedTraits.length > 0))
        ) {
            return;
        }

        const krName = krItemNames.get(item.apiName);
        const processedItem = {
            ...item,
            name: krName || item.name,
            icon: toPNG(item.icon)
        };

        if (iconPath.includes('augments/') || apiName.includes('augments') || item.type === 'Augment') {
            processedAugments.push(processedItem);
            return;
        }

        if (iconPath.includes('items/components/')) {
            basicItems.push(processedItem);
        } else if (iconPath.includes('items/radiant/')) {
            radiantItems.push(processedItem);
        } else if (iconPath.includes('items/artifacts/') || apiName.includes('ornn') || apiName.includes('artifact')) {
            ornnItems.push(processedItem);
        } else if (iconPath.includes('items/emblems/') || (item.associatedTraits && item.associatedTraits.length > 0)) {
            emblemItems.push(processedItem);
        } else if (iconPath.includes('items/special/support/')) {
            supportItems.push(processedItem);
        } else if (
            apiName.includes('corruptedchassis') || apiName.includes('cybercoil') || apiName.includes('fluxcapacitor') ||
            apiName.includes('holobow') || apiName.includes('hyperfangs') || apiName.includes('pulsestabilizer') ||
            apiName.includes('repulsorlantern') || apiName.includes('tft_item_corruptedchassis') || apiName.includes('tft_item_cybercoil') ||
            apiName.includes('tft_item_fluxcapacitor') || apiName.includes('tft_item_holobow') || apiName.includes('tft_item_hyperfangs') ||
            apiName.includes('tft_item_pulsestabilizer') || apiName.includes('tft_item_repulsorlantern')
        ) {
            robotItems.push(processedItem);
        } else if (item.composition && item.composition.length > 0) {
            completedItems.push(processedItem);
        } else if (apiName.startsWith('tft_item_') && !apiName.includes('_component_') && item.goldValue > 0) {
            completedItems.push(processedItem);
        }
        else {
            unknownItems.push(processedItem);
        }
    });

    tftData = {
      items: {
        basic: basicItems,
        completed: completedItems,
        ornn: ornnItems,
        radiant: radiantItems,
        emblem: emblemItems,
        support: supportItems,
        robot: robotItems,
        unknown: unknownItems,
      },
      augments: processedAugments, // 이제 processedAugments가 정의됨
      champions: champions,
      traitMap: traitMap,
      currentSet: `Set${currentSetKey}`,
      krNameMap: new Map([
        ...Array.from(krChampionNames.entries()).map(([key, value]) => [key.toLowerCase(), value]),
        ...Array.from(krTraitNames.entries()).map(([key, value]) => [key.toLowerCase(), value]),
        ...Array.from(krItemNames.entries()).map(([key, value]) => [key.toLowerCase(), value])
      ])
    };
    
    const totalItemCount = basicItems.length + completedItems.length + ornnItems.length + 
                           radiantItems.length + emblemItems.length + supportItems.length + robotItems.length + unknownItems.length;
    console.log(`TFT 데이터 초기화 완료! (시즌: ${tftData.currentSet}, 챔피언 ${tftData.champions.length}개, 아이템 ${totalItemCount}개, 증강체 ${tftData.augments.length}개)`);
    return tftData;

  } catch (error) {
    console.error(`TFT 데이터 서비스 초기화 실패: ${error.message}`);
    tftData = null;
    return null;
  }
};

export default getTFTData;