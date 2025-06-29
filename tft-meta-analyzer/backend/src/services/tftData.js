import axios from 'axios';

let tftData = null;

const EN_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';
const KR_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json';

const CDN_URL_PLUGINS_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
const CDN_URL_GAME_BASE    = 'https://raw.communitydragon.org/latest/game/';

export const IDX2KEY = ['inactive', 'bronze', 'silver', 'gold', 'prismatic'];
export const STYLE_ORDER = { inactive:0, bronze:1, silver:2, gold:3, prismatic:4, chromatic:5 };
export const PALETTE = {
  bronze:'#B06A49', silver:'#D0D6D9', gold:'#E6C68C',
  prismatic:'#FFFFFF', unique:'#FFA773', inactive:'#6C757D',
};

/*──────────────────── 아이콘 경로 변환 ────────────────────*/
const toPNG = (path) => {
  if (!path) return null;
  let lowerPath = path.toLowerCase();

  /* (1) particles/tft/item_icons  전용 — 세트 4→14 엠블럼 + .tex→.png  */
  if (lowerPath.includes('assets/maps/particles/tft/item_icons/')) {

    /* 1-a  Set4 Vanguard Emblem → Set14 경로 교정 */
    if (lowerPath.includes('/spatula/set4/') &&
        lowerPath.includes('_emblem_vanguard')) {
      lowerPath = lowerPath
        .replace('/spatula/set4/', '/spatula/set14/')
        .replace('tft_sr4_5_emblem_vanguard_128', 'tft14_emblem_vanguard.tft_set14');
    }

    /* 1-b  .tex / .dds → .png */
    lowerPath = lowerPath.replace(/\.(tex|dds)$/, '.png');

    const processed = lowerPath.substring(lowerPath.indexOf('assets/'));
    return `${CDN_URL_GAME_BASE}${processed}`;
  }

  /* (2) .tex / .dds → .png  (기타 경로) */
  if (lowerPath.endsWith('.tex') || lowerPath.endsWith('.dds')) {
    lowerPath = lowerPath.replace(/\.(tex|dds)$/, '.png');
  }

  /* (3) 컴포넌트 standard 폴더 */
  if (lowerPath.includes('assets/maps/tft/item_icons/standard/')) {
    const processed = lowerPath.substring(lowerPath.indexOf('assets/maps/tft/item_icons/standard/'));
    return `${CDN_URL_GAME_BASE}${processed}`;
  }

  /* (4) 일반 icons 폴더 */
  if (lowerPath.includes('assets/maps/tft/icons/')) {
    const processed = lowerPath.substring(lowerPath.indexOf('assets/maps/tft/icons/'));
    return `${CDN_URL_GAME_BASE}${processed}`;
  }

  /* (5) plugins 경로 */
  if (lowerPath.startsWith('/lol-game-data/assets/')) {
    const processed = lowerPath.substring('/lol-game-data/assets/'.length);
    return `${CDN_URL_PLUGINS_BASE}assets/${processed}`;
  }
  if (lowerPath.startsWith('assets/')) {
    const processed = lowerPath.substring('assets/'.length);
    return `${CDN_URL_PLUGINS_BASE}assets/${processed}`;
  }
  if (lowerPath.startsWith('characters/') || lowerPath.startsWith('v1/champion-icons/')) {
    return `${CDN_URL_PLUGINS_BASE}${lowerPath}`;
  }
  if (lowerPath.startsWith('maps/')) {
    return `${CDN_URL_GAME_BASE}assets/${lowerPath}`;
  }

  console.warn(`WARN_TOPNG: Unrecognized path pattern for: ${path}. Trying default plugins/assets/ base.`);
  return `${CDN_URL_PLUGINS_BASE}assets/${lowerPath}`;
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
        .filter(champ => champ.cost > 0 && champ.traits?.length > 0 && !champ.apiName.includes('Tutorial'))
        .map(enChamp => {
            const krChamp = krSetData.champions.find(c => c.apiName === enChamp.apiName);
            
            // 영문 원본의 스킬 정보를 기준으로 삼습니다.
            const baseAbility = enChamp.ability || enChamp.abilities?.[0];
            let finalAbility = null;

            if (baseAbility) {
                // 1. 깊은 복사를 통해 원본(enChamp)이 오염되지 않도록 합니다.
                finalAbility = JSON.parse(JSON.stringify(baseAbility));

                // 2. 한글 데이터가 존재하면, 복사된 객체에 안전하게 덮어씁니다.
                if (krChamp) {
                    const krAbility = krChamp.ability || krChamp.abilities?.[0];
                    if (krAbility) {
                        finalAbility.name = krAbility.name || finalAbility.name; // 한글 스킬 이름
                        finalAbility.desc = krAbility.desc || finalAbility.desc; // 한글 스킬 설명
                    }
                }
            }
            
            return {
                ...enChamp,
                // 3. 새로 만든 finalAbility 객체를 할당합니다.
                ability: finalAbility,
                abilities: undefined, // 프론트엔드 혼동 방지를 위해 원본 배열 제거
                name: krChampionNames.get(enChamp.apiName) || enChamp.name, // 사용자님 코드에 있던 krChampionNames 변수 사용
                tileIcon: toPNG(enChamp.tileIcon),
                traits: krChamp ? krChamp.traits : enChamp.traits, // 💡 핵심 수정: krChamp의 traits 사용, 없으면 enChamp 사용
            };
        });
    console.log("DEBUG: Sample Champion Traits after processing in tftData.js:", champions[0]?.traits);
    const traitMap = new Map();
    console.log("tftData.js: enSetData.traits before forEach:", enSetData.traits);
    enSetData.traits.forEach(trait => {
        const krName = krTraitNames.get(trait.apiName);
        if (krName) {
            trait.name = krName;
        }
        trait.icon = toPNG(trait.icon); 
        const mapKey = trait.apiName.toLowerCase();

        // 💡 핵심 수정: 계열/직업 목록을 기반으로 type 할당
        const originsList = ['거리의 악마', '군주', '네트워크의 신', '니트로', '동물특공대', '바이러스', '사이버보스', '범죄 조직', '사이퍼', '신성기업', '엑소테크', '영혼 살해자', '폭발 봇', '황금황소'];
        const classesList = ['기술광', '난동꾼', '다이나모', '사격수', '선봉대', '속사포', '요새', '증.폭.', '책략가', '처형자', '학살자'];

        if (originsList.includes(trait.name)) {
            trait.type = 'origin';
        } else if (classesList.includes(trait.name)) {
            trait.type = 'class';
        } else {
            // 알려진 목록에 없으면 기본값으로 'unknown' 또는 'origin' 설정
            // 여기서는 일단 'unknown'으로 설정하여 분류되지 않은 특성을 파악하기 쉽게 함
            trait.type = 'unknown'; 
            console.warn(`WARN: Unknown trait type for: ${trait.name} (${trait.apiName}). Assigned 'unknown' type.`);
        }

        traitMap.set(mapKey, trait);
        console.log("tftData.js: Added to traitMap - Key:", mapKey, "Value:", trait);
    });
    console.log("tftData.js: traitMap size after population:", traitMap.size);

    // traitMap을 일반 객체로 변환하여 JSON 직렬화에 대비
    const plainTraitMap = {};
    traitMap.forEach((value, key) => {
        plainTraitMap[key] = value;
    });
    console.log("tftData.js: plainTraitMap after conversion:", plainTraitMap);

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
            apiName.includes('trainingdummy') ||
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
      traits: Object.values(plainTraitMap), // plainTraitMap의 값들을 traits 배열로 할당
      traitMap: traitMap, // traitMap은 Map 객체 그대로 유지
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