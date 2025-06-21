// backend/src/cache/matchCache.js
//----------------------------------------------------------
// 아주 단순한 인-메모리 캐시 래퍼
//  - stdTTL:  초(Seconds) 단위 기본 TTL
//  - checkperiod: 만료된 항목 정리 주기
//----------------------------------------------------------

import NodeCache from 'node-cache';

/** ▶ 기본 30분 보관, 5분마다 청소 */
const cache = new NodeCache({
  stdTTL: 60 * 30,
  checkperiod: 60 * 5,
});

/* ⬇️  라우터·서비스에서 쓸 때 .get / .set / .del 정도만 쓰면 됩니다 */
export const matchCache = {
  /** value 있으면 그대로, 없으면 null */
  get(key) {
    return cache.get(key) ?? null;
  },

  /** ttlSeconds 지정하지 않으면 기본 TTL 사용 */
  set(key, value, ttlSeconds) {
    cache.set(key, value, ttlSeconds);
  },

  del(key) {
    cache.del(key);
  },

  flush() {
    cache.flushAll();
  },
};
