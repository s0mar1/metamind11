// backend/src/utils/tft-helpers.js

const IDX2KEY = ['inactive', 'bronze', 'silver', 'gold', 'prismatic', 'chromatic'];
const STYLE_ORDER = { prismatic: 5, chromatic: 4, gold: 3, silver: 2, bronze: 1, inactive: 0 };

export const getTraitStyleInfo = (traitApiName, currentUnitCount, tftStaticData) => {
  if (!tftStaticData || !tftStaticData.traitMap) {
    console.warn(`[getTraitStyleInfo] tftStaticData or traitMap is missing.`);
    return null;
  }
  const meta = tftStaticData.traitMap.get(traitApiName.toLowerCase());
  if (!meta) return null;

  let styleKey = 'inactive';
  let styleOrder = 0;
  
  // minUnits 기준으로 오름차순 정렬
  const sortedEffects = [...(meta.effects || [])].sort((a, b) => a.minUnits - b.minUnits);

  for (const effect of sortedEffects) {
    if (currentUnitCount >= effect.minUnits) {
      styleKey = IDX2KEY[effect.style] || 'bronze';
      styleOrder = STYLE_ORDER[styleKey] || 0;
    }
  }
  
  return {
    name: meta.name,
    apiName: traitApiName,
    image_url: meta.icon,
    tier_current: currentUnitCount,
    style: styleKey,
    styleOrder: styleOrder,
  };
};