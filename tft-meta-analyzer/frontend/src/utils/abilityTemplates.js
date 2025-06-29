/**
 * abilityTemplates.js: 챔피언별 커스텀 툴팁 생성 로직
 * 각 템플릿은 tooltipParser.js의 유틸리티를 활용합니다.
 */
import { buildVariableMap, formatValuesByStar } from './tooltipParser.js';

// ==========================================================
//                        헬퍼 함수
// ==========================================================

function createFormattedValue(varMap, key, prefix = '', isPercent = true) {
    const lowerKey = key.toLowerCase();
    if (!varMap.has(lowerKey)) return null;
    const values = varMap.get(lowerKey).value;
    const formattedString = formatValuesByStar(values, isPercent);
    return `${prefix} ${formattedString}`.trim();
}

// ==========================================================
//                      기본 템플릿
// ==========================================================

function defaultTemplate(championData) {
    const { ability, stats } = championData;
    const description = ability.desc
        .replace(/<[^>]+>/g, '')
        .replace(/@([^@]+)@/g, '')
        .replace(/\s+/g, ' ').trim();
    // getStructuredValues는 현재 구현에서 제외되었으므로, 빈 배열을 기본값으로 사용
    const values = []; 
    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values,
    };
}

// ==========================================================
//                 챔피언별 커스텀 템플릿 목록
// ==========================================================

function seraphineTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const falloffValue = Math.round(varMap.get('damagemod')?.value[1] * 100 || 40);
    const description = `현재 대상을 관통하는 음파를 발사해 마법 피해를 입힙니다. 적중한 적 하나당 피해량이 ${falloffValue}% 감소합니다.`;
    const damageValue = createFormattedValue(varMap, 'BaseDamage', '주문력의');
    values.push({ label: '피해량', value: damageValue });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function zedTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = "표식이 없는 4칸 내의 가장 멀리 떨어진 적에게 표창을 던져 마법 피해를 입히고 표식을 남깁니다. 이후, 대상으로 지정할 수 없는 상태가 되어 대상에게 순간이동하고 표식이 있는 다른 모든 적에게 그림자를 소환합니다. 제드는 인접한 적에게 물리 피해를, 그림자는 인접한 적에게 물리 피해를 입힙니다.";
    values.push({ label: '표창 피해량', value: createFormattedValue(varMap, 'BaseShurikenDamage', '주문력의') });
    values.push({ label: '회전 피해량', value: createFormattedValue(varMap, 'BaseSpinDamage', '공격력의') });
    values.push({ label: '그림자 피해량', value: createFormattedValue(varMap, 'BaseShadowSpinDamage', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function kindredTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = ability.desc.replace(/<[^>]+>/g, '').replace(/@TotalDamage@\(%i:scaleAD%\)/, '').trim();
    if (varMap.has('apdamage')) {
        values.push({ label: '추가 피해량', value: createFormattedValue(varMap, 'APDamage', '주문력의') });
    }
    if (varMap.has('percentattackdamage')) {
        const adValues = varMap.get('percentattackdamage').value.slice(1).map(v => `${Math.round(v * 100)}%`).join(' / ');
        values.push({ label: '피해량', value: `공격력의 ${adValues} + 추가 피해량` });
    }
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values };
}

function nidaleeTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const numTargets = Math.round(varMap.get('numtargets')?.value[1] || 2);
    const healAmount = Math.round(varMap.get('healamount')?.value[1] || 100);
    const healPerTarget = Math.round(varMap.get('healamountpertarget')?.value[1] || 20);
    const description = `현재 대상에게 마법 피해를 입히고 가장 가까운 적 ${numTargets}명에게는 마법 피해를 입힙니다. 체력을 ${healAmount}+적중한 적 하나당 ${healPerTarget} 회복합니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    values.push({ label: '충전 시 피해량', value: createFormattedValue(varMap, 'AmpedDamage', '주문력의') });
    const bonusTargets = Math.round(varMap.get('bonustargetsperamp')?.value[1] || 1);
    values.push({ label: '추가 대상', value: `${numTargets} + 증폭당 ${bonusTargets}` });
    values.push({ label: '기본 체력 회복량', value: createFormattedValue(varMap, 'HealAmount', '', false) });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function morganaTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const duration = Math.round(varMap.get('duration')?.value[1] || 16);
    const description = `대상 및 가장 가까운 해킹되지 않은 적을 해킹하여 ${duration}초 동안 마법 피해를 입힙니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function drMundoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const passiveHpBonus = Math.round(varMap.get('percenthpbonus')?.value[1] * 100 || 30);
    const description = `기본 지속 효과: 모든 요소로부터 최대 체력을 ${passiveHpBonus}% 더 얻습니다.\n\n사용 시: 근육을 뽐내며 체력을 회복한 후, 현재 대상에게 물리 피해를 입힙니다.`;
    const healHpValues = formatValuesByStar(varMap.get('percentmaximumhealthhealing')?.value, true);
    const healApValues = formatValuesByStar(varMap.get('aphealing')?.value, true);
    values.push({ label: '체력 회복량', value: `체력의 ${healHpValues} + 주문력의 ${healApValues}` });
    const damageHpValues = formatValuesByStar(varMap.get('percentmaximumhealthdamage')?.value, true);
    const damageAdValues = formatValuesByStar(varMap.get('percentattackdamage')?.value, true);
    values.push({ label: '피해량', value: `체력의 ${damageHpValues} + 공격력의 ${damageAdValues}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values };
}

function viTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const duration = Math.round(varMap.get('duration')?.value[1] || 4);
    const description = `${duration}초에 걸쳐 빠르게 사라지는 보호막을 얻습니다. 바이의 다음 기본 공격이 물리 피해를 입힙니다.`;
    const shieldAp = createFormattedValue(varMap, 'BaseShield', '주문력의');
    const shieldHp = createFormattedValue(varMap, 'ShieldHealthRatio', '체력의');
    values.push({ label: '보호막', value: `${shieldAp} + ${shieldHp}` });
    const damageAd = createFormattedValue(varMap, 'BaseDamageRatio', '공격력의');
    values.push({ label: '피해량', value: damageAd });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function poppyTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const hexRange = Math.round(varMap.get('hexrange')?.value[1] || 4);
    const description = `${hexRange}칸 내 가장 멀리 있는 적에게 방패를 던져 마법 피해를 입힙니다. 보호막을 얻습니다.`;
    const damageArmor = createFormattedValue(varMap, 'PercentArmorDamage', '방어력의');
    const damageAp = createFormattedValue(varMap, 'BaseDamage', '주문력의');
    values.push({ label: '피해량', value: `${damageArmor} + ${damageAp}` });
    const shieldValue = createFormattedValue(varMap, 'ShieldAmount', '주문력의');
    values.push({ label: '보호막', value: shieldValue });
    const bossDamage = createFormattedValue(varMap, 'ReducedDamage', '피해량의');
    values.push({ label: '최종 형태 피해량', value: bossDamage });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function sylasTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = "최대 체력을 얻고 현재 대상에게 마법 피해를 입힙니다. 처치 시 추가로 체력을 얻습니다.";
    values.push({ label: '체력', value: createFormattedValue(varMap, 'APHealth', '주문력의') });
    const damageAp = createFormattedValue(varMap, 'BaseDamage', '주문력의');
    const damageHp = createFormattedValue(varMap, 'DamageHealthRatio', '체력의');
    values.push({ label: '피해량', value: `${damageAp} + ${damageHp}` });
    values.push({ label: '처치 시 체력', value: createFormattedValue(varMap, 'OnKillHealth', '', false) });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function shacoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const passiveAdGain = Math.round(varMap.get('adpercentgain')?.value[1] * 1000) / 10;
    const description = `기본 지속 효과: 이번 게임에서 적을 처치할 때마다 공격력을 ${passiveAdGain}% 얻습니다.\n\n사용 시: 현재 대상에게 물리 피해를 입힙니다.\n\n범죄 두목 추가 효과: 3칸 내 체력이 가장 낮은 적 뒤로 순간이동해 추가 물리 피해를 입힙니다.`;
    const damageAd = createFormattedValue(varMap, 'PercentAttackDamage', '공격력의');
    const damageAp = createFormattedValue(varMap, 'APDamage', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    const bossDamage = createFormattedValue(varMap, 'T1DamageMod', '공격력의');
    values.push({ label: '보스 피해량', value: bossDamage });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function alistarTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const stunDuration = Math.round(varMap.get('stunduration')?.value[1] || 2);
    const description = `기본 지속 효과: 받는 모든 피해가 감소합니다.\n\n사용 시: 현재 대상에게 마법 피해를 입히고 ${stunDuration}초 동안 기절시킵니다.`;

    values.push({
        label: '받는 피해 감소량',
        value: createFormattedValue(varMap, 'FlatDamageReduction', '', false),
    });
    values.push({
        label: '피해량',
        value: createFormattedValue(varMap, 'Damage', '주문력의'),
    });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}

/**
 * 자이라(Zyra)를 위한 커스텀 템플릿
 */
function zyraTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const stunDuration = Math.round(varMap.get('stunduration')?.value[1] || 1);
    const description = `현재 대상에게 거대한 덩굴을 보내 ${stunDuration}초 동안 기절시키고 마법 피해를 입힙니다. 가장 가까운 대상에게 작은 덩굴을 보내 마법 피해를 입힙니다.`;

    values.push({
        label: '주 대상 피해량',
        value: createFormattedValue(varMap, 'TargetDamage', '주문력의'),
    });
    values.push({
        label: '2차 피해량',
        value: createFormattedValue(varMap, 'SecondaryDamage', '주문력의'),
    });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}

/**
 * 잭스(Jax)를 위한 커스텀 템플릿
 */
function jaxTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const duration = Math.round(varMap.get('duration')?.value[1] || 4);
    const description = `${duration}초 동안 보호막을 얻고 인접한 적에게 마법 피해를 입힙니다.`;

    values.push({
        label: '보호막',
        value: createFormattedValue(varMap, 'BaseShield', '주문력의'),
    });
    values.push({
        label: '피해량',
        value: createFormattedValue(varMap, 'BaseDamage', '주문력의'),
    });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}

/**
 * 코그모(KogMaw)를 위한 커스텀 템플릿
 */
function kogmawTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const duration = Math.round(varMap.get('duration')?.value[1] || 5);
    const attackSpeed = Math.round(varMap.get('attackspeedpercent')?.value[1] * 100 || 50);
    const description = `다음 ${duration}초 동안 공격 속도를 ${attackSpeed}% 얻고 기본 공격 시 추가 물리 피해를 입힙니다.`;

    values.push({
        label: '주문력 비례 피해량',
        value: createFormattedValue(varMap, 'APDamage', '', false),
    });
    
    const adDamage = createFormattedValue(varMap, 'PercentAttackDamage', '공격력의');
    values.push({
        label: '피해량',
        value: `${adDamage} + 주문력 비례 피해량`,
    });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}

/**
 * 그레이브즈(Graves)를 위한 커스텀 템플릿
 */
function gravesTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const numProjectiles = Math.round(varMap.get('numprojectiles')?.value[1] || 5);
    const attacksPerCast = Math.round(varMap.get('attackspercast')?.value[1] || 2);
    const empoweredShells = Math.round(varMap.get('basepoweredshells')?.value[1] || 2);
    const description = `기본 지속 효과: 기본 공격 시 원뿔 범위에 투사체를 ${numProjectiles}개 발사해 각각 물리 피해를 입힙니다. 그레이브즈는 기본 공격 ${attacksPerCast}회마다 스킬을 사용합니다.\n\n사용 시: 대상 옆으로 돌진한 뒤 재빠르게 강화된 탄환을 ${empoweredShells}개 발사해 투사체 하나당 물리 피해를 입힙니다.`;

    const projectileDamage = createFormattedValue(varMap, 'ProjectileADDamage', '공격력의');
    values.push({ label: '피해량', value: projectileDamage });

    const empoweredAd = createFormattedValue(varMap, 'EmpoweredProjectileADDamage', '공격력의');
    const empoweredAp = createFormattedValue(varMap, 'EmpoweredAPBaseDamage', '주문력의', false); // AP값은 %가 아님
    values.push({ label: '강화된 피해량', value: `${empoweredAd} + ${empoweredAp}` });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}
/**
 * 나피리(Naafiri)를 위한 커스텀 템플릿
 */
function naafiriTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const omnivamp = Math.round(varMap.get('omnivamppercent')?.value[1] * 100 || 15);
    const numPackmates = Math.round(varMap.get('numpackmates')?.value[1] || 3);
    const description = `기본 지속 효과: 모든 피해 흡혈을 ${omnivamp}% 얻습니다.\n\n사용 시: 현재 대상에게 물리 피해를 입힙니다. 이후, 무리 ${numPackmates}마리와 알파를 소환합니다. 무리와 알파는 현재 대상에게 물리 피해를 입힙니다.`;

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'ADRatio', '공격력의') });
    values.push({ label: '무리 피해량', value: createFormattedValue(varMap, 'ADPerPackmate', '공격력의') });
    values.push({ label: '알파 피해량', value: createFormattedValue(varMap, 'ADPerGigaDog', '공격력의') });
    
    const numGigaDogs = Math.round(varMap.get('numgigadogs')?.value[1] || 1);
    const bonusGigaDogs = Math.round(varMap.get('bonusgigadogsperamp')?.value[1] || 1);
    values.push({ label: '알파 소환', value: `${numGigaDogs} + 증폭당 ${bonusGigaDogs}` });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 다리우스(Darius)를 위한 커스텀 템플릿
 */
function dariusTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const duration = Math.round(varMap.get('duration')?.value[1] || 6);
    const sunder = Math.round(varMap.get('sundertooltip')?.value[1] * 100 || 20);
    const bossRange = Math.round(varMap.get('t1hexrange')?.value[1] || 2);
    const bossFalloff = Math.round(varMap.get('t1damagefalloff')?.value[1] * 100 || 5);
    const description = `체력을 회복한 후, 1칸 이내 적에게 물리 피해를 입히고 ${duration}초 동안 파열을 ${sunder}% 적용합니다.\n\n범죄 두목 추가 효과: 스킬 사거리가 ${bossRange}칸으로 증가합니다. 1칸 멀어질 때마다 피해량이 ${bossFalloff}% 감소합니다. 적중한 적 1명당 체력을 회복합니다.\n\n파열: 방어력 감소`;

    const healAp = createFormattedValue(varMap, 'BaseHeal', '', false); // %가 아님
    const healHp = createFormattedValue(varMap, 'HealHealthRatio', '체력의');
    values.push({ label: '체력 회복량', value: `${healAp} (AP) + ${healHp}` });

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'ADRatio', '공격력의') });

    const bossHealBase = createFormattedValue(varMap, 'T1HealPerTarget', '', false);
    const bossHealHp = createFormattedValue(varMap, 'T1HealHealthRatio', '체력의');
    values.push({ label: '범죄 두목 회복량', value: `${bossHealBase} + ${bossHealHp}` });
    
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 라아스트(Rhaast)를 위한 커스텀 템플릿
 */
function rhaastTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const stunDuration = varMap.get('stunduration')?.value[1] || 1.75;
    const description = `${stunDuration}초 동안 대상을 공중으로 띄워 올립니다. 지속시간 동안 체력을 회복하고 대상에게 물리 피해를 입힙니다.`;

    const healAp = createFormattedValue(varMap, 'BaseHeal', '주문력의');
    const healHp = createFormattedValue(varMap, 'PercentHealthHeal', '최대 체력의');
    values.push({ label: '체력 회복량', value: `${healAp} + ${healHp}` });

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'ADDamageRatio', '공격력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 르블랑(LeBlanc)를 위한 커스텀 템플릿
 */
function leblancTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const sigilCount = Math.round(varMap.get('sigilcount')?.value[1] || 5);
    const sigilIncrement = Math.round(varMap.get('sigilincrement')?.value[1] || 1);
    const description = `인장을 ${sigilCount}개 보내 현재 대상 및 그다음 가장 가까운 적에게 번갈아 각각 마법 피해를 입힙니다. 스킬을 사용할 때마다 인장을 ${sigilIncrement}개 더 보냅니다.`;

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 베이가(Veigar)를 위한 커스텀 템플릿
 */
function veigarTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const sameStarDmg = Math.round(varMap.get('samestarpercenttruedamage')?.value[1] * 100 || 25);
    const higherStarDmg = Math.round(varMap.get('higherstarpercenttruedamage')?.value[1] * 100 || 40);
    const description = `현재 대상에게 마법 피해를 입힙니다.\n\n베이가의 별 레벨이 대상의 별 레벨과 같다면 ${sameStarDmg}%의 고정 피해를 입힙니다. 베이가의 별 레벨이 대상의 별 레벨보다 높다면 ${higherStarDmg}%의 고정 피해를 입힙니다.`;

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    // 'ReducedDamage' 변수가 최종 형태 피해량으로 보임
    values.push({ label: '최종 형태 피해량', value: createFormattedValue(varMap, 'ReducedDamage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 베인(Vayne)를 위한 커스텀 템플릿
 */
function vayneTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const numAttacks = Math.round(varMap.get('numattacks')?.value[1] || 3);
    const description = `신속하게 ${numAttacks}회 공격합니다. 첫 2회의 공격은 추가 고정 피해를 입히고 마지막 공격은 추가 고정 피해를 입힙니다.`;

    values.push({ label: '적중 시 피해량', value: createFormattedValue(varMap, 'TrueDamageADRatio', '공격력의') });

    const finalAd = createFormattedValue(varMap, 'FinalTrueDamageADRatio', '공격력의');
    const finalAp = createFormattedValue(varMap, 'BaseFinalMagicDamage', '주문력의');
    values.push({ label: '최종 타격', value: `${finalAd} + ${finalAp}` });
    
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
function shyvanaTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const damageAmp = Math.round(varMap.get('damageamp')?.value[1] * 100 || 10);
    const description = `첫 스킬 사용 시: 전투가 끝날 때까지 매초 체력을 회복하고 인접한 적에게 마법 피해를 입힙니다.\n\n최대 체력을 얻고, 피해 증폭을 ${damageAmp}% 얻습니다.`;

    const healAp = createFormattedValue(varMap, 'HealPerTickBase', '주문력의');
    const healHp = createFormattedValue(varMap, 'HealPerTickPercent', '체력의');
    values.push({ label: '초당 체력 회복량', value: `${healAp} + ${healHp}` });

    const damageAp = createFormattedValue(varMap, 'APDamage', '주문력의', false);
    const damageHp = createFormattedValue(varMap, 'PercentHealthDamage', '체력의');
    values.push({ label: '피해량', value: `${damageAp} + ${damageHp}` });

    values.push({ label: '체력', value: createFormattedValue(varMap, 'APHealth', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 스카너(Skarner)를 위한 커스텀 템플릿
 */
function skarnerTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const duration = Math.round(varMap.get('duration')?.value[1] || 3);
    const description = `${duration}초 동안 보호막을 얻고 미사일을 장착합니다. 보호막이 사라지면 2칸 내 가장 큰 적 무리에 미사일을 발사해 가장 중앙에 있는 적에게 마법 피해를 입히고 인접한 적에게 해당 피해량의 50%만큼 피해를 입힙니다.`;

    values.push({ label: '보호막', value: createFormattedValue(varMap, 'BaseShield', '주문력의') });

    const baseDamage = createFormattedValue(varMap, 'BaseDamage', '', false);
    const resistDamage = createFormattedValue(varMap, 'ResistsDamageRatio', '방어력의');
    values.push({ label: '총 피해량', value: `${baseDamage} + ${resistDamage}` });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}


/**
 * 에코(Ekko)를 위한 커스텀 템플릿
 */
function ekkoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const description = "체력을 회복하고 현재 대상에게 마법 피해를 입힙니다.";

    values.push({ label: '체력 회복량', value: createFormattedValue(varMap, 'HealAmt', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 일라오이(Illaoi)를 위한 커스텀 템플릿
 */
function illaoiTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const mrShred = Math.round(varMap.get('mrreduction')?.value[1] || 15);
    const description = `체력을 회복합니다. 현재 대상에게 마법 피해를 입히고 1칸 내의 적에게 피해를 입힙니다. 전투가 끝날 때까지 대상의 마법 저항력을 ${mrShred} 감소시킵니다.`;
    
    values.push({ label: '체력 회복량', value: createFormattedValue(varMap, 'BaseHeal', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    values.push({ label: '광역 피해', value: createFormattedValue(varMap, 'BaseSplashDamage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 진(Jhin)를 위한 커스텀 템플릿
 */
function jhinTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const sunderDuration = varMap.get('sunderduration')?.value[1] || 4.4;
    const sunderPercent = Math.round(varMap.get('sunderpercent')?.value[1] * 100 || 20);
    const description = `적 4명을 타격하는 반동 유탄을 발사해 물리 피해를 입히고 적중한 적에게 ${sunderDuration}초 동안 파열을 ${sunderPercent}% 적용합니다. 마지막으로 튕긴 유탄은 첫 대상에게 돌아와 물리 피해를 입힙니다.\n\n파열: 방어력 감소`;

    values.push({ label: '반동 피해량', value: createFormattedValue(varMap, 'BounceADRatio', '공격력의') });
    values.push({ label: '최종 반동 피해량', value: createFormattedValue(varMap, 'FinalBounceADRatio', '공격력의') });
    // '파열 지속시간'은 '정답'에 없지만, 데이터에는 AP 계수가 있어 추가. 불필요 시 이 라인 제거 가능
    values.push({ label: '파열 지속시간', value: createFormattedValue(varMap, 'SunderDuration', '주문력의', false) });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 트위스티드 페이트(Twisted Fate)를 위한 커스텀 템플릿
 */
function twistedFateTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const apGain = varMap.get('apgain')?.value[1] || 1.5;
    const description = `기본 지속 효과: 기본 공격마다 주문력을 ${apGain} 얻습니다.\n\n사용 시: 현재 대상 및 그다음 가장 가까운 대상에게 카드를 던져 마법 피해를 입힙니다.\n\n범죄 두목 추가 효과: 현재 대상에게 무작위 특수 카드를 던져 마법 피해를 입힙니다. 붉은색 카드는 1칸 내의 적들에게 적중합니다. 푸른색 카드는 피해량의 50%만큼 고정 피해를 입힙니다. 노란색 카드는 낮은 확률로 골드를 제공합니다.`;

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    values.push({ label: '특수 카드 피해량', value: createFormattedValue(varMap, 'T1BonusDamage', '주문력의') });
    
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 갈리오(Galio)를 위한 커스텀 템플릿
 */
function galioTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    
    const duration = Math.round(varMap.get('duration')?.value[1] || 3);
    const stunDuration = varMap.get('stunduration')?.value[1] || 1.5;
    const description = `${duration}초 동안 내구력을 얻습니다. 이후, 체력을 회복하고 그동안 갈리오에게 가장 많은 피해를 입힌 3 칸 이내 적에게 회오리바람을 보냅니다. 회오리바람은 마법 피해를 입히고 ${stunDuration}초 동안 기절시킵니다.`;
    
    values.push({ label: '내구력', value: createFormattedValue(varMap, 'Durability', '') });
    values.push({ label: '체력 회복', value: createFormattedValue(varMap, 'BaseHeal', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 그라가스(Gragas)를 위한 커스텀 템플릿
 */
function gragasTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const description = `체력을 회복한 후, 3칸 이내 가장 큰 적 무리를 향해 술통을 던져 1칸 내의 적에게 마법 피해를 입힙니다.`;

    const healAp = createFormattedValue(varMap, 'HealBase', '주문력의');
    const healHp = createFormattedValue(varMap, 'MaxHPHealRatio', '최대 체력의');
    values.push({ label: '체력 회복량', value: `${healHp} + ${healAp}` });

    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
function dravenTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const reducedDamage = Math.round(varMap.get('reduceddamagepercent')?.value[1] * 100 || 20);
    const description = `일직선상 적이 가장 많은 방향으로 거대한 도끼 두 개를 던져 물리 피해를 입힙니다. 이후 도끼가 되돌아옵니다. 피해량은 적중한 적 1명당 ${reducedDamage}% 감소합니다.`;
    const damageAd = createFormattedValue(varMap, 'BigOutADRatio', '공격력의');
    const damageAp = createFormattedValue(varMap, 'BaseAPDamage', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function rengarTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const hexRange = Math.round(varMap.get('hexrange')?.value[1] || 2);
    const numSlashes = Math.round(varMap.get('numslashes')?.value[1] || 2);
    const description = `체력을 회복하고 ${hexRange}칸 내 체력이 가장 낮은 적에게 도약해 물리 피해를 입힙니다. 이후 ${numSlashes}회 타격해 각각 물리 피해를 입힙니다.\n\n스킬을 사용할 때마다 도약 범위가 1칸씩 증가합니다.`;
    values.push({ label: '체력 회복량', value: createFormattedValue(varMap, 'HealAmount', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'ADPercent', '공격력의') });
    values.push({ label: '가르기 피해량', value: createFormattedValue(varMap, 'SlashADPercent', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function mordekaiserTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const shieldDuration = Math.round(varMap.get('shieldduration')?.value[1] || 4);
    const stunDuration = varMap.get('stunduration')?.value[1] || 1.25;
    const description = `${shieldDuration}초 동안 보호막을 얻습니다. 현재 대상을 강타해 일직선상으로 2칸 내 모든 적에게 마법 피해를 입히고 ${stunDuration}초 동안 기절시킵니다.`;
    values.push({ label: '보호막', value: createFormattedValue(varMap, 'BaseShieldAmount', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'SlamDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function varusTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const stunDuration = Math.round(varMap.get('stunduration')?.value[1] || 1);
    const numTargets = Math.round(varMap.get('numadditionaltargets')?.value[1] || 3);
    const description = `사슬을 발사해 마법 피해를 입히고 ${stunDuration}초 동안 기절시킵니다. 사슬은 가장 가까운 적 ${numTargets}명에게 연결되어 각각 마법 피해를 입힙니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'MainTargetBaseDamage', '주문력의') });
    values.push({ label: '사슬 피해량', value: createFormattedValue(varMap, 'SecondaryTargetBaseDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function braumTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const shieldDuration = Math.round(varMap.get('shieldduration')?.value[1] || 4);
    const stunDuration = Math.round(varMap.get('stunduration')?.value[1] || 3);
    const bossResists = Math.round(varMap.get('bossresistst1')?.value[1] || 30);
    const bossPeriod = Math.round(varMap.get('bossthornsperiod')?.value[1] || 4);
    const description = `${shieldDuration}초 동안 보호막을 얻습니다. 보호막이 파괴되면 가장 가까운 적 3명에게 마법 피해를 입히고 ${stunDuration}초 동안 동상에 걸리게 합니다.\n\n범죄 두목 추가 효과: 방어력 및 마법 저항력을 ${bossResists} 얻습니다. ${bossPeriod}초마다 브라움이 다음 기본 공격 시 추가 마법 피해를 입힙니다.\n\n둔화: 공격 속도 20% 감소`;
    const shieldAp = createFormattedValue(varMap, 'BaseShield', '주문력의');
    const shieldHp = createFormattedValue(varMap, 'PercentHealthForShield', '체력의');
    values.push({ label: '보호막', value: `${shieldAp} + ${shieldHp}` });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    const bossResistDmg = createFormattedValue(varMap, 'BossDamageResistPercent', '방어력 및 마법 저항력의');
    const bossHpDmg = createFormattedValue(varMap, 'BossDamageHealthPercent', '최대 체력의');
    values.push({ label: '보스 피해량', value: `${bossResistDmg} + ${bossHpDmg}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function sennaTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = `기본 지속 효과: 기본 공격 시 대상 주변 적에게 물리 피해를 입힙니다.\n\n사용 시: 현재 대상 너머 2칸까지 광선을 발사하여 적중한 적에게 물리 피해를 입힙니다.`;
    const damageAd = createFormattedValue(varMap, 'SpellADPercent', '공격력의');
    const damageAp = createFormattedValue(varMap, 'SpellAPPercent', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    values.push({ label: '기본 지속 효과 피해량', value: createFormattedValue(varMap, 'SplitADPercent', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function eliseTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const numTarget = Math.round(varMap.get('numtargetlasers')?.value[1] || 4);
    const numAdditional = Math.round(varMap.get('numadditionalenemies')?.value[1] || 2);
    const numNearest = Math.round(varMap.get('numnearestlasers')?.value[1] || 4);
    const mrShred = Math.round(varMap.get('magicresistreduction')?.value[1] || 5);
    const description = `현재 대상에게 레이저 ${numTarget}개를 발사하고 추가로 가장 가까운 적 ${numAdditional}명에게 레이저 ${numNearest}개를 나누어 발사합니다. 레이저는 각각 마법 피해를 입히고 이후 전투가 끝날 때까지 마법 저항력을 ${mrShred} 감소시킵니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'APDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function yuumiTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const manaPerAmp = Math.round(varMap.get('manaperamp')?.value[1] || 3);
    const description = `기본 지속 효과: 매초 마나를 얻습니다.\n\n사용 시: 현재 대상을 향해 마법 미사일을 발사합니다. 마법 미사일은 가장 가까운 적에게 튕기며 현재 대상에게 마법 피해를, 가장 가까운 적에게 마법 피해를 입히고 두 대상에게 표식을 남깁니다. 적에게 이미 표식이 있다면 190%의 피해를 입힙니다.`;
    values.push({ label: '초당 마나', value: `증폭당 ${manaPerAmp}` });
    values.push({ label: '1차 피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    values.push({ label: '2차 피해량', value: createFormattedValue(varMap, 'SecondaryDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function jarvanTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const shieldDuration = Math.round(varMap.get('shieldduration')?.value[1] || 4);
    const shieldBase = Math.round(varMap.get('baseshield')?.value[1] || 270); // 1성 기준 값으로 예시
    const shieldBonus = Math.round(varMap.get('bonusshield')?.value[1] || 30);
    const armorReduce = Math.round(varMap.get('flatarmorreduction')?.value[1] || 15);
    const description = `적이 가장 많은 반원 범위를 타격해 ${shieldDuration}초 동안 ${shieldBase}+적중한 적 하나당 ${shieldBonus}의 보호막을 얻습니다. 적중한 적에게 물리 피해를 입히고 전투가 끝날 때까지 방어력을 ${armorReduce}만큼 감소시킵니다.`;
    values.push({ label: '보호막', value: createFormattedValue(varMap, 'BaseShield', '주문력의') });
    values.push({ label: '추가 보호막', value: createFormattedValue(varMap, 'BonusShield', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'SweepDamageAD', '공격력의') });
    values.push({ label: '방어력 감소', value: createFormattedValue(varMap, 'FlatArmorReduction', '', false) });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
function jinxTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const baseRockets = Math.round(varMap.get('baserockets')?.value[1] || 5);
    const description = `현재 대상으로부터 2칸 내에 있는 무작위 적들에게 로켓 ${baseRockets}발을 발사합니다. 각 로켓은 물리 피해를 입힙니다. 스킬을 사용할 때마다 로켓 1개를 추가로 발사합니다.`;
    const damageAd = createFormattedValue(varMap, 'PercentAttackDamage', '공격력의');
    const damageAp = createFormattedValue(varMap, 'APDamage', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function fiddlesticksTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const duration = Math.round(varMap.get('duration')?.value[1] || 3);
    const numEnemies = Math.round(varMap.get('numenemies')?.value[1] || 3);
    const shred = Math.round(varMap.get('shredpercent')?.value[1] * 100 || 20);
    const heal = Math.round(varMap.get('healpercent')?.value[1] * 100 || 15);
    const description = `${duration}초 동안 가장 가까운 적 ${numEnemies}명을 연결해 초당 마법 피해를 나누어 입힙니다. 연결 시 파쇄를 ${shred}% 적용하고 피들스틱이 입힌 피해량의 ${heal}%만큼 체력을 회복합니다.\n\n파쇄: 마법 저항력 감소`;
    values.push({ label: '초당 피해량', value: createFormattedValue(varMap, 'DamagePerSecond', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function neekoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const shieldDuration = Math.round(varMap.get('shieldduration')?.value[1] || 4);
    const chillDuration = Math.round(varMap.get('chillduration')?.value[1] || 3);
    const description = `${shieldDuration}초 동안 보호막을 얻고 3번 폭발하며 범위가 점점 넓어지는 구역을 만듭니다. 각 폭발은 적중한 적에게 마법 피해를 입힙니다. 3번째 폭발은 적을 ${chillDuration}초 동안 동상에 걸리게 합니다.\n\n둔화: 공격 속도 20% 감소`;
    const shieldAp = createFormattedValue(varMap, 'ShieldAmt', '주문력의');
    const shieldHp = createFormattedValue(varMap, 'ShieldHealthPercent', '체력의');
    values.push({ label: '보호막', value: `${shieldAp} + ${shieldHp}` });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'APDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function leonaTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const drDuration = Math.round(varMap.get('drduration')?.value[1] || 4);
    const stunDuration = Math.round(varMap.get('stunduration')?.value[1] || 2);
    const markDuration = Math.round(varMap.get('markdamageduration')?.value[1] || 4);
    const description = `${drDuration}초 동안 내구력을 얻습니다. 2칸 내 가장 큰 적 무리에게 마법 피해를 입히고 중앙에 있는 적을 ${stunDuration}초 동안 기절시킵니다.\n\n이 스킬에 피해를 입은 적은 ${markDuration}초 동안 아군 기본 공격 시 추가 마법 피해를 입습니다.`;
    values.push({ label: '내구력', value: createFormattedValue(varMap, 'DRPercent', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    values.push({ label: '추가 마법 피해량', value: createFormattedValue(varMap, 'MagicResistDamageRatio', '마법 저항력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function missFortuneTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const duration = varMap.get('channelduration')?.value[1] || 2;
    const waves = Math.round(varMap.get('wavecount')?.value[1] || 9);
    const reducedDmg = Math.round(varMap.get('percentreducedbulletdamage')?.value[1] * 100 || 25);
    const bonusWaves = Math.round(varMap.get('t1bonuswaves')?.value[1] || 3);
    const description = `${duration}초 동안 가장 큰 적 무리를 향해 총을 ${waves}회 난사합니다. 난사마다 적에게 총알이 처음 적중되면 물리 피해를 입히고 이후 총알은 ${reducedDmg}% 감소한 피해를 입힙니다.\n\n범죄 두목 추가 효과: ${bonusWaves}회 더 난사합니다.`;
    const damageAd = createFormattedValue(varMap, 'BulletDamageADRatio', '공격력의');
    const damageAp = createFormattedValue(varMap, 'BulletBaseDamage', '주문력의');
    values.push({ label: '첫 번째 총알 피해량', value: `${damageAd} + ${damageAp}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function vexTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const omnivamp = Math.round(varMap.get('omnivampamt')?.value[1] * 100 || 18);
    const conversion = Math.round(varMap.get('overhealconversion')?.value[1] * 100 || 150);
    const description = `기본 지속 효과: 모든 피해 흡혈을 ${omnivamp}% 얻습니다. 응징 피해량으로 얻은 초과 회복량의 ${conversion}%는 주 대상에게 입히는 추가 고정 피해로 전환됩니다.\n\n사용 시: 대상에게 그림자를 보내 통과하는 모든 적에게 마법 피해를 입힙니다. 이후 그림자가 폭발하여 대상에게 마법 피해를, 1칸 내의 적에게 마법 피해를 입힙니다.`;
    values.push({ label: '관통 피해량', value: createFormattedValue(varMap, 'InitialDamage', '주문력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    values.push({ label: '범위 피해량', value: createFormattedValue(varMap, 'AOEDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function brandTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const range = Math.round(varMap.get('modifiedcastrange')?.value[1] || 5); // 데이터에 이 변수가 없음, 기본값 사용
    const radius = Math.round(varMap.get('primaryhexradius')?.value[1] || 1);
    const numSecondary = Math.round(varMap.get('numsecondarymissiles')?.value[1] || 4);
    const description = `${range}칸 이내 가장 큰 적 무리를 향해 페인트 폭탄을 던져 ${radius}칸 내의 적에게 마법 피해를 입히고 가장 가까운 적 ${numSecondary}명에게 마법 피해를 입힙니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'APDamage', '주문력의') });
    values.push({ label: '2차 피해량', value: createFormattedValue(varMap, 'SecondaryAPDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
function sejuaniTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const bonusResists = Math.round(varMap.get('bonusresists')?.value[1] * 100 || 30);
    const description = `기본 지속 효과: 모든 요소로부터 방어력 및 마법 저항력을 ${bonusResists}% 더 얻습니다.\n\n사용 시: 가장 가까운 적에게 EMP를 던집니다. EMP는 2초 뒤에 폭발하여 3칸 내 적에게 마법 피해를 입히고 기절시킵니다.`;
    values.push({ label: '받는 피해 감소량', value: createFormattedValue(varMap, 'FlatDamageReduction', '', false) });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    values.push({ label: '기절 지속시간', value: createFormattedValue(varMap, 'StunDuration', '', false) });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function apheliosTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = "가장 큰 적 무리를 향해 달빛 에너지를 발사해 2칸 내 모든 적에게 물리 피해를 입힙니다.\n\n이후 투척 무기를 4개(달빛 에너지에 맞은 적 하나당 1개 추가) 장착하여 다음 기본 공격 8회 동안 추가 물리 피해를 입힙니다.";
    const damageAd = createFormattedValue(varMap, 'BlastAD', '공격력의');
    const damageAp = createFormattedValue(varMap, 'BlastAP', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    values.push({ label: '차크람 피해량', value: createFormattedValue(varMap, 'ChakramPercentAD', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function annieTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const castCount = Math.round(varMap.get('castcount')?.value[1] || 4);
    const description = `현재 대상에게 화염구를 던져 마법 피해를 입힙니다. 화염구는 작은 화염구 3개로 나뉘어져 대상과 주변 적 2명에게 각각 마법 피해를 입힙니다.\n\n스킬을 ${castCount}회 사용할 때마다 대신 현재 대상 옆에 티버를 소환해 주변 1칸 내의 적에게 마법 피해를 입힙니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseMainDamage', '주문력의') });
    const baseFireballs = Math.round(varMap.get('basenumfireballs')?.value[1] || 2);
    const bonusFireballs = Math.round(varMap.get('bonusfireballsperamp')?.value[1] || 1);
    values.push({ label: '작은 화염구', value: `${baseFireballs} + 증폭당 ${bonusFireballs}` });
    values.push({ label: '작은 화염구 피해량', value: createFormattedValue(varMap, 'BaseBonusDamage', '주문력의') });
    values.push({ label: '티버 피해량', value: createFormattedValue(varMap, 'BaseTibbersDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function xayahTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const featherCount = Math.round(varMap.get('feathercount')?.value[1] || 6);
    const description = `현재 대상에게 꿰뚫는 깃털 ${featherCount}개를 날려 각각 물리 피해를 입힙니다. 대상이 사망하면 깃털은 2칸 내 주변 적을 추적하여 각각 물리 피해를 입힙니다.`;
    const damageAd = createFormattedValue(varMap, 'CastADPercent', '공격력의');
    const damageAp = createFormattedValue(varMap, 'SpellBaseDamage', '주문력의'); // 'DamageBonus' 대신 'SpellBaseDamage'일 가능성 있음
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    values.push({ label: '탐색 피해량', value: createFormattedValue(varMap, 'BaseExplosionDamage', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function zeriTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const copyDamage = Math.round(varMap.get('copydamagepercent')?.value[1] * 100 || 40);
    const description = `주변 위치로 빠르게 돌진하며 대상으로 지정할 수 없는 잔상을 남깁니다. 잔상은 제리처럼 기본 공격을 하지만, 대신 ${copyDamage}%의 피해를 입힙니다.\n\n잔상은 5초 동안 지속되며 제리가 사망하면 사라집니다.`;
    values.push({ label: '잔상 피해량', value: createFormattedValue(varMap, 'CopyDamagePercent', '') });
    const durationBase = createFormattedValue(varMap, 'BaseDuration', '', false);
    const durationScaling = createFormattedValue(varMap, 'ScalingDuration', '주문력의', false);
    values.push({ label: '지속시간', value: `${durationBase} + ${durationScaling}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function ziggsTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const singleTargetBonus = Math.round(varMap.get('singletargetdamagepercentincrease')?.value[1] * 100 || 100);
    const description = `공격 사거리 내 적이 가장 많은 십자꼴에 폭탄을 던져 마법 피해를 입힙니다. 유닛 한 명에게만 적중한 경우 피해량이 ${singleTargetBonus}% 증가합니다.`;
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'Damage', '주문력의') });
    values.push({ label: '최종 형태 피해량', value: createFormattedValue(varMap, 'BossDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function chogathTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = `원뿔 범위에 어지러운 음파를 발사해 마법 피해를 입힙니다. 최대 체력을 얻고 크기가 커지며 이후 음파의 크기가 증가합니다.`;
    const damageAp = createFormattedValue(varMap, 'Damage', '', false);
    const damageHp = createFormattedValue(varMap, 'PercentHealthDamage', '체력의');
    values.push({ label: '피해량', value: `${damageAp}% + ${damageHp}` });
    const healthAp = createFormattedValue(varMap, 'MaxHealthBase', '주문력의');
    const healthHp = createFormattedValue(varMap, 'MaxHealthHPScalar', '시작 체력의');
    values.push({ label: '체력', value: `${healthAp} + ${healthHp}` });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
function garenTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const shieldDuration = varMap.get('shieldduration')?.value[1] || 1.5;
    const targetThreshold = Math.round(varMap.get('targetthreshold')?.value[1] || 2);
    const manaRefund = Math.round(varMap.get('manarefund')?.value[1] || 30);
    const description = `${shieldDuration}초 동안 보호막을 얻습니다. 현재 대상에게 물리 피해를 입히고 파동을 보내 적중한 적에게 물리 피해를 입힙니다. 파동이 ${targetThreshold}명 이하의 적에게 적중할 경우 마나를 ${manaRefund} 얻습니다.`;
    values.push({ label: '보호막', value: createFormattedValue(varMap, 'BaseShield', '주문력의', true) });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '공격력의', true) });
    values.push({ label: '파도 피해량', value: createFormattedValue(varMap, 'BaseWaveDamage', '공격력의', true) });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function renektonTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = `체력을 회복한 후, 2칸 내의 적에게 물리 피해를 입히고 5초 동안 불태우기 및 상처를 적용합니다.\n\n첫 스킬 사용 시: 광분 상태에 돌입해 기본 공격 시 2회 타격하여 물리 피해를 입히며, 새로운 대상에게 돌진할 수 있습니다.\n두 번째 스킬 사용 시: 이제 광분 상태에서 기본 공격 시 3회 타격하여 물리 피해를 입힙니다. 재사용 불가\n\n불태우기: 매초 대상 최대 체력의 1%만큼 고정 피해\n상처: 체력 회복량 33% 감소`;
    const damageAd = createFormattedValue(varMap, 'ADSpellRatio', '공격력의');
    const damageAp = createFormattedValue(varMap, 'SpellBaseDamage', '주문력의');
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });
    values.push({ label: '회복량', value: createFormattedValue(varMap, 'MaxHealthGain', '', false) });
    values.push({ label: '2회 공격', value: createFormattedValue(varMap, 'FirstCastADRatio', '공격력의') });
    values.push({ label: '3회 공격', value: createFormattedValue(varMap, 'SecondCastADRatio', '공격력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function viegoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = `기본 지속 효과: 유닛이 사망할 경우, 해당 유닛의 영혼을 흡수해 체력을 회복합니다.\n\n사용 시: 2칸 내의 가장 큰 적 무리에게 도약해 인접한 적에게 마법 피해를, 2칸 이내 다른 적에게 마법 피해를 입힙니다. 적중한 모든 적에게 4초 동안 파쇄를 20% 적용합니다.\n\n파쇄: 마법 저항력 감소`;
    values.push({ label: '체력 회복량', value: createFormattedValue(varMap, 'SoulHealPercent', '최대 체력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    values.push({ label: '광역 피해', value: createFormattedValue(varMap, 'BaseSplashDamage', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

function samiraTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];
    const description = `대상에게 돌진해 2초 동안 3칸 이내 적에게 총알을 나누어 발사합니다. 각 총알은 방어력을 3만큼 파쇄하고 물리 피해를 입힙니다. 사미라에게서 1칸 멀어질 때마다 피해량이 20% 감소합니다.\n\n난사가 끝나면 안전한 곳으로 돌진하며 현재 대상에게 물리 피해를 입힙니다.\n\n스킬 지속시간 동안 사미라는 저지 불가 상태가 되고 모든 피해 흡혈을 얻습니다.`;
    const numBullets = Math.round(varMap.get('numbullets')?.value[1] || 22);
    const bonusBullets = Math.round(varMap.get('bonusbulletsperamp')?.value[1] || 1);
    values.push({ label: '총알 수', value: `${numBullets} + AMP당 ${bonusBullets}` });
    values.push({ label: '총알 피해량', value: createFormattedValue(varMap, 'BulletADDamage', '공격력의') });
    values.push({ label: '돌진 피해량', value: createFormattedValue(varMap, 'SlideADDamage', '공격력의') });
    values.push({ label: '모든 피해 흡혈', value: createFormattedValue(varMap, 'Omnivamp', '주문력의') });
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
/**
 * 자크(Zac)를 위한 커스텀 템플릿
 */
function zacTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    // 1. 설명에 필요한 값들을 안전하게 추출
    const passiveHealthTrigger = Math.round(varMap.get('splitpercenthealth')?.value[1] * 100 || 10);
    const passiveCopyHealth = Math.round(varMap.get('passivehealthtriggerpercent')?.value[1] * 100 || 50);
    const bounceCount = Math.round(varMap.get('bouncecount')?.value[1] || 3);
    const stunDuration = varMap.get('stunduration')?.value[1] || 1;

    // 2. 설명 텍스트를 재구성
    const description = `기본 지속 효과: 체력이 ${passiveHealthTrigger}%일 때, 체력을 ${passiveCopyHealth}% 지닌 복사본 두 명으로 나뉩니다.\n\n사용 시: 주변 적에게 ${bounceCount}회 튀어 오릅니다. 튀어 오를 때마다 적에게 마법 피해를 입히고 ${stunDuration}초 동안 기절시키며 자크가 체력을 회복합니다.`;

    // 3. 상세 스펙 목록 생성
    const damageAp = createFormattedValue(varMap, 'APDamage', '주문력의');
    const damageHp = createFormattedValue(varMap, 'PercentHealthDamage', '체력의');
    values.push({
        label: '피해량',
        value: `${damageAp} + ${damageHp}`,
    });

    values.push({
        label: '체력 회복량',
        value: createFormattedValue(varMap, 'BaseHeal', '주문력의'),
    });

    return {
        name: ability.name,
        mana: `${stats.initialMana}/${stats.mana}`,
        description,
        values: values.filter(v => v.value),
    };
}
/**
 * 우르곳(Urgot)을 위한 커스텀 템플릿
 */
function urgotTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const duration = Math.round(varMap.get('duration')?.value[1] || 5);
    const attackSpeed = Math.round(varMap.get('attackspeed')?.value[1] * 100 || 125);
    const range = Math.round(varMap.get('modifiedcastrange')?.value[1] || 5); // 데이터에 없음, 기본값 사용
    const numRockets = Math.round(varMap.get('nummissiles')?.value[1] || 3);
    const execute = Math.round(varMap.get('executethreshold')?.value[1] * 100 || 15);
    const description = `${duration}초 동안 공격 속도를 ${attackSpeed}% 얻고 ${range}칸 내 체력 비율이 가장 낮은 적을 조준합니다. 기본 공격 시 로켓도 ${numRockets}발 발사해 물리 피해를 입힙니다.\n\n스킬을 사용할 때마다 조준한 적의 체력이 처음으로 ${execute}% 아래로 떨어지면 적을 끌어당겨 처형하고 조각으로 분쇄합니다.`;

    const damageAd = createFormattedValue(varMap, 'MissileADPercent', '공격력의');
    const damageAp = createFormattedValue(varMap, 'MissileBaseDamage', '주문력의', false);
    values.push({ label: '피해량', value: `${damageAd} + ${damageAp}` });

    values.push({ label: '아이템 가루 확률', value: createFormattedValue(varMap, 'ComponentChance', '') });
    values.push({ label: '골드 가루 확률', value: createFormattedValue(varMap, 'GoldChance', '') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}

/**
 * 코부코(Kobuko)를 위한 커스텀 템플릿
 */
function kobukoTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const passiveHp = Math.round(varMap.get('passivehealththreshold')?.value[1] * 100 || 50);
    const enrageAs = Math.round(varMap.get('enrageas')?.value[1] * 100 || 100);
    const enrageOv = Math.round(varMap.get('enrageomnivamp')?.value[1] * 100 || 30);
    const enrageDmg = Math.round(varMap.get('enrageonhitbonus')?.value[1] * 100 || 33);
    const description = `기본 지속 효과: 기본 공격 시 추가 마법 피해를 입힙니다. 체력이 ${passiveHp}%일 때, '2단계'가 발동되어 전투가 끝날 때까지 격분해 공격 속도를 ${enrageAs}%, 모든 피해 흡혈을 ${enrageOv}% 얻고 추가 피해가 ${enrageDmg}% 증가합니다.\n\n2단계: 4초 동안 피해를 흡수하는 보호막을 얻습니다. 주변 적 1명을 붙잡아 2칸 이내 모든 적을 1.5초 동안 공중으로 띄워 올립니다. 이후 땅으로 내려찍어 대상에게 마법 피해를 입히고 적중한 다른 모든 적에게 피해를 입힙니다.`;
    
    values.push({ label: '적중 시 피해량', value: createFormattedValue(varMap, 'OnHitDamage', '주문력의') });
    values.push({ label: '보호막', value: createFormattedValue(varMap, 'PassiveShieldHealthRatio', '체력의') });
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'SlamPrimaryTargetBaseDamage', '주문력의') });
    values.push({ label: '광역 피해량', value: createFormattedValue(varMap, 'SlamSecondaryTargetBaseDamage', '주문력의') });

    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}


/**
 * 오로라(Aurora)를 위한 커스텀 템플릿
 */
function auroraTemplate(championData) {
    const { ability, stats } = championData;
    const varMap = buildVariableMap(ability.variables);
    const values = [];

    const description = "첫 스킬 사용 시 대기석의 가장 왼쪽에 있는 챔피언과 위치를 교체하고 전투를 계속합니다. 해당 챔피언은 공격 속도를 얻습니다. 위치를 교체한 챔피언이 죽으면 전장으로 돌아갑니다.\n\n일직선 방향으로 가장 많은 적에게 적중하는 위치로 순간이동하여 발사해 적중한 적에게 각각 마법 피해를 입히고, 추가로 적중한 모든 적에게 피해를 나누어 입힙니다.\n\n오로라는 또 다른 오로라와 위치를 교체할 수 없습니다.";
    
    values.push({ label: '피해량', value: createFormattedValue(varMap, 'BaseDamage', '주문력의') });
    values.push({ label: '범위 피해량', value: createFormattedValue(varMap, 'SplitDamage', '주문력의') });
    values.push({ label: '공격 속도', value: createFormattedValue(varMap, 'BonusAttackSpeed', '주문력의') });
    
    return { name: ability.name, mana: `${stats.initialMana}/${stats.mana}`, description, values: values.filter(v => v.value) };
}
// ==========================================================
//                 템플릿 등록
// ==========================================================
const templates = {
    'TFT14_Jinx': jinxTemplate,
    'TFT14_Fiddlesticks': fiddlesticksTemplate,
    'TFT14_Neeko': neekoTemplate,
    'TFT14_Leona': leonaTemplate,
    'TFT14_MissFortune': missFortuneTemplate,
    'TFT14_Vex': vexTemplate,
    'TFT14_Brand': brandTemplate,
    'TFT14_Draven': dravenTemplate,
    'TFT14_Rengar': rengarTemplate,
    'TFT14_Mordekaiser': mordekaiserTemplate,
    'TFT14_Varus': varusTemplate,
    'TFT14_Braum': braumTemplate,
    'TFT14_Senna': sennaTemplate,
    'TFT14_Elise': eliseTemplate,
    'TFT14_Yuumi': yuumiTemplate,
    'TFT14_JarvanIV': jarvanTemplate,
    'TFT14_Shyvana': shyvanaTemplate,
    'TFT14_Skarner': skarnerTemplate,
    'TFT14_Ekko': ekkoTemplate,
    'TFT14_Illaoi': illaoiTemplate,
    'TFT14_Jhin': jhinTemplate,
    'TFT14_TwistedFate': twistedFateTemplate,
    'TFT14_Galio': galioTemplate,
    'TFT14_Gragas': gragasTemplate,
    'TFT14_Alistar': alistarTemplate,
    'TFT14_Zyra': zyraTemplate,
    'TFT14_Jax': jaxTemplate,
    'TFT14_KogMaw': kogmawTemplate,
    'TFT14_Graves': gravesTemplate,
    'TFT14_Naafiri': naafiriTemplate,
    'TFT14_Darius': dariusTemplate,
    'TFT14_Rhaast': rhaastTemplate,
    'TFT14_LeBlanc': leblancTemplate,
    'TFT14_Veigar': veigarTemplate,
    'TFT14_Vayne': vayneTemplate,
    'TFT14_Seraphine': seraphineTemplate,
    'TFT14_Vi': viTemplate,
    'TFT14_Poppy': poppyTemplate,
    'TFT14_Sylas': sylasTemplate,
    'TFT14_Shaco': shacoTemplate,
    'TFT14_NidaleeCougar': nidaleeTemplate,
    'TFT14_Morgana': morganaTemplate,
    'TFT14_DrMundo': drMundoTemplate,
    'TFT14_Kindred': kindredTemplate,
    'TFT14_Zed': zedTemplate,
    'TFT14_Sejuani': sejuaniTemplate,
    'TFT14_Aphelios': apheliosTemplate,
    'TFT14_Annie': annieTemplate,
    'TFT14_Xayah': xayahTemplate,
    'TFT14_Zeri': zeriTemplate,
    'TFT14_Ziggs': ziggsTemplate,
    'TFT14_Chogath': chogathTemplate,
    'TFT14_Garen': garenTemplate,
    'TFT14_Renekton': renektonTemplate,
    'TFT14_Viego': viegoTemplate,
    'TFT14_Samira': samiraTemplate,
    'TFT14_Zac': zacTemplate, 
    'TFT14_Urgot': urgotTemplate,
    'TFT14_Kobuko': kobukoTemplate,
    'TFT14_Aurora': auroraTemplate,
};

// ==========================================================
//                 메인 함수
// ==========================================================
export function generateTooltip(championData) {
    if (!championData || !championData.apiName) {
        return { name: '알 수 없는 챔피언', description: '챔피언 데이터가 올바르지 않습니다.', values: [] };
    }
    const template = templates[championData.apiName] || defaultTemplate;
    try {
        return template(championData);
    } catch (error) {
        console.error(`Error processing template for ${championData.apiName}:`, error);
        // 안정성을 위해 에러 발생 시 기본 템플릿으로 대체
        return defaultTemplate(championData);
    }
}