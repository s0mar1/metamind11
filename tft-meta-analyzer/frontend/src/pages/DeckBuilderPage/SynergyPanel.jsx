import React, { useMemo } from 'react';

export default function SynergyPanel({ placedUnits, allTraits }) {
  // 각 특성별 배치 수 집계
  const traitCount = useMemo(() => {
    const cnt = {};
    Object.values(placedUnits).forEach(u => {
      u.traits.forEach(tr => {
        cnt[tr] = (cnt[tr] || 0) + 1;
      });
    });
    return cnt;
  }, [placedUnits]);

  // threshold 이상인 시너지만 추출
  const active = useMemo(
    () =>
      allTraits
        .filter(tr => traitCount[tr.name] >= tr.threshold)
        .map(tr => ({ ...tr, count: traitCount[tr.name] })),
    [allTraits, traitCount]
  );

  return (
    <div className="bg-gray-800 p-4 rounded-lg text-white">
      <h2 className="mb-2 font-bold">활성 시너지</h2>
      {active.length === 0 ? (
        <p className="text-gray-400">배치된 유닛이 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {active.map(tr => (
            <li key={tr.name} className="flex justify-between">
              <span>{tr.name}</span>
              <span>{tr.count}/{tr.threshold}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
