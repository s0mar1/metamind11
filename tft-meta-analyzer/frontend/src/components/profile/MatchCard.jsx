/* eslint-disable react/prop-types */
import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classNames from 'classnames';

dayjs.extend(relativeTime);

/* -------------------------------------------------------------------------- */
/*  시너지 등급 숫자(1~4) → HEX 색상                                           */
/* -------------------------------------------------------------------------- */
const getTraitHexColor = (styleOrder) => {
  switch (styleOrder) {
    case 1:
      return '#CD7F32'; // 브론즈
    case 2:
      return '#C0C0C0'; // 실버
    case 3:
      return '#FFD700'; // 골드
    case 4:
      return '#B9F2FF'; // 프리즘/크로마틱
    default:
      return '#AAAAAA'; // 비활성
  }
};

/* 유닛 Cost → 테두리 색상 Tailwind 클래스 */
const costBorder = (cost) => {
  switch (cost) {
    case 1:
      return 'border-gray-400';
    case 2:
      return 'border-green-400';
    case 3:
      return 'border-blue-400';
    case 4:
      return 'border-purple-400';
    case 5:
    default:
      return 'border-yellow-400';
  }
};

/* -------------------------------------------------------------------------- */
/*  MatchCard 컴포넌트                                                         */
/* -------------------------------------------------------------------------- */
export default function MatchCard({ match, userPuuid }) {
  if (!match) return null;

  const {
    placement,
    level,
    dateString,
    timeSince,
    traits,
    units,
    items,
  } = match;

  /* 왼쪽 Border 색 (등수) */
  const placementColor = (() => {
    if (placement <= 4) return 'border-indigo-600';
    if (placement <= 6) return 'border-gray-400';
    return 'border-gray-500';
  })();

  return (
    <div className="bg-white rounded shadow-sm mb-3">
      {/* ─────────── 상단: 등수·시간 ─────────── */}
      <div className={classNames('flex items-center p-4 border-l-4', placementColor)}>
        {/* 숫자 블록 */}
        <div className="mr-4 text-center">
          <div className="text-2xl font-bold text-gray-700">#{placement}</div>
          <div className="text-sm text-gray-500">레벨 {level}</div>
          <div className="text-xs text-gray-400">{dateString}</div>
        </div>

        {/* ─────────── 시너지 뱃지 ─────────── */}
        <div className="flex flex-col flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {traits
              .filter((t) => t.styleOrder > 0)                     // 숫자 비교
              .sort(
                (a, b) =>
                  b.styleOrder - a.styleOrder ||                   // ① 등급 높은 순
                  b.tier_current - a.tier_current,                // ② 유닛 수
              )
              .map((trait, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: getTraitHexColor(trait.styleOrder) }}
                  title={`${trait.name} (${trait.tier_current}단계)`}
                >
                  {trait.image_url && (
                    <img
                      src={trait.image_url}
                      alt={trait.name}
                      className="w-5 h-5"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  {trait.tier_current}
                </div>
              ))}
          </div>

          {/* ─────────── 유닛 아이콘 리스트 ─────────── */}
          <div className="flex gap-1">
            {units.map((unit, idx) => (
              <div
                key={idx}
                className={classNames(
                  'relative',
                  'border-2',
                  costBorder(unit.rarity + 1),
                  'rounded',
                )}
              >
                <img
                  src={unit.image_url}
                  alt={unit.character_id}
                  className="w-12 h-12 rounded"
                  onError={(e) => (e.target.style.display = 'none')}
                />
                {/* ★ 표시 */}
                {unit.star && (
                  <div className="absolute -top-1 -left-1 text-yellow-300 text-xs">
                    {'★'.repeat(unit.star)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─────────── 아이템 리스트 ─────────── */}
          {items.length > 0 && (
            <div className="flex gap-1 mt-1">
              {items.map((item, idx) => (
                <img
                  key={idx}
                  src={item.image_url}
                  alt={item.name}
                  className="w-6 h-6 rounded"
                  onError={(e) => (e.target.style.display = 'none')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────── 경기 시간 (상대적) ─────────── */}
      <div className="px-4 pb-3 text-right text-xs text-gray-400">
        {dayjs(timeSince).fromNow()} 플레이
      </div>
    </div>
  );
}
