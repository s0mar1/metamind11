// frontend/src/utils/tooltipParser.js

// 변수 이름을 보기 좋은 한글 레이블로 변환 (필요에 따라 추가)
const getLabelForVar = (varName) => {
  const lower = varName.toLowerCase();
  if (lower.includes('damage')) return '피해량';
  if (lower.includes('shield')) return '보호막';
  if (lower.includes('heal')) return '회복량';
  if (lower.includes('stun')) return '기절 지속시간';
  if (lower.includes('duration')) return '지속시간';
  return varName; // 기본값은 변수 이름 그대로
};

// 메인 파싱 함수
export const parseAbility = (ability) => {
  if (!ability || !ability.desc) {
    return { cleanDesc: '', details: [] };
  }

  // 1. 변수 맵 생성 (이름을 소문자로 통일)
  const varMap = new Map();
  if (ability.variables) {
    ability.variables.forEach(v => {
      varMap.set(v.name.toLowerCase(), v.value);
    });
  }

  // 2. 상세 정보 라인 추출 및 생성
  const details = [];
  const seenVars = new Set();
  const formulaRegex = /@([^@]+)@/g;

  let tempDesc = ability.desc;
  
  // 변수들을 순회하며 처리
  tempDesc = tempDesc.replace(formulaRegex, (match, varFullName) => {
    // 예: "ModifiedDamage" 또는 "SameStarPercentTrueDamage*100"
    const parts = varFullName.split('*');
    const varName = parts[0].toLowerCase();
    const multiplier = parts.length > 1 ? parseFloat(parts[1]) : 1;

    if (varMap.has(varName)) {
      const values = Array.isArray(varMap.get(varName)) ? varMap.get(varName) : [varMap.get(varName)];
      
      // 값이 레벨별로 다른 경우 (배열 길이가 1 초과) 별도 라인으로 추출
      if (values.length > 1 && !seenVars.has(varName)) {
        const formattedValues = values
          .filter(v => v !== 0) // 의미 없는 0 값은 제외
          .map(v => `${Math.round(v * multiplier * 100) / 100}`) // 소수점 둘째 자리까지
          .join(' / ');
        
        details.push(`${getLabelForVar(varName)}: ${formattedValues}`);
        seenVars.add(varName);
        return ''; // 원본 설명에서는 제거
      }
      // 단일 값이면 바로 치환
      else {
        return `${Math.round(values[0] * multiplier * 100) / 100}`;
      }
    }
    return match; // 변수를 못찾으면 그대로 둠
  });

  // 3. 남은 HTML 태그 정리 및 최종 설명 생성
  const cleanDesc = tempDesc
    .replace(/<[^>]+>/g, ' ') // 모든 HTML 태그 제거
    .replace(/\s{2,}/g, ' ') // 연속된 공백 하나로
    .trim();

  return { cleanDesc, details };
};