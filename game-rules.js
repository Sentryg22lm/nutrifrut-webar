export const RULES = Object.freeze({ durationMs:15000, firstSpawnMs:300, intervalMs:400, lifetimeMs:1700, itemCount:37, points:10, minReactionMs:80, minGapMs:75 });
export function makeSchedule(seed) {
  let value = Math.trunc(Number(seed)) % 2147483647;
  if (value <= 0) value = 1;
  const next = () => { value = value * 48271 % 2147483647; return value / 2147483647; };
  // Eight random values per ingredient; the server reproduces the first two.
  return Array.from({length:RULES.itemCount}, (_,id) => ({
    id, spawnMs:RULES.firstSpawnMs+id*RULES.intervalMs+Math.floor(next()*241)-120,
    lifetimeMs:1400+Math.floor(next()*801), type:Math.floor(next()*3),
    x:-.34+next()*.68, y:-.23+next()*.58, z:.16+next()*.08,
    phase:next()*Math.PI*2, sway:(next()-.5)*.7,
  }));
}
export function validHit(item, elapsedMs, previousMs = -1000) {
  return Number.isFinite(elapsedMs) && elapsedMs >= item.spawnMs+RULES.minReactionMs && elapsedMs < RULES.durationMs && elapsedMs <= item.spawnMs+item.lifetimeMs && elapsedMs >= previousMs+RULES.minGapMs;
}
export function scoreHits(hits) { return new Set(hits.map(hit=>hit.id)).size*RULES.points; }
export function batteryPercent(score) { return Math.min(100,5+Math.floor(Math.max(0,score)/(RULES.itemCount*RULES.points)*95)); }
