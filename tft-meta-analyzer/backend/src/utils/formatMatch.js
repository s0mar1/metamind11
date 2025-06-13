/* -------------------------------------------------------------------------- */
/*  match.info + participant → 프런트 친화적 객체 변환                        */
/* -------------------------------------------------------------------------- */
export function formatMatch(info, participant, traits, cdnBaseUrl = '') {
  /* 기본 */
  const placement  = participant.placement;
  const level      = participant.level;
  const gameDate   = new Date(info.game_datetime);
  const dateString = gameDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day  : '2-digit',
  });
  const timeSince  = info.game_datetime;

  /* 유닛 */
  const units = participant.units.map((u) => {
    const championKey = u.character_id.toLowerCase(); // "tft10_yasuo"
    const image_url   =
      cdnBaseUrl &&
      `${cdnBaseUrl}/cdragon/tft/champions/${championKey}.png`;

    return {
      character_id: u.character_id,
      rarity      : u.rarity,   // 0‒4  (프런트에서 +1 = cost)
      star        : u.tier,     // 1‒3
      image_url,
    };
  });

  /* 아이템 (모든 유닛 items 합치기) */
  const items = participant.units
    .flatMap((u) => u.items || [])
    .map((id) => ({
      id,
      name     : `item_${id}`,
      image_url:
        cdnBaseUrl &&
        `${cdnBaseUrl}/cdragon/tft/items/${id}.png`,
    }));

  return {
    placement,
    level,
    dateString,
    timeSince,
    traits,   // 이미 등급 계산된 배열
    units,
    items,
  };
}
