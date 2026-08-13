const KEY = Symbol.for("kaxi.synonym-cache-version");

type GlobalCache = typeof globalThis & { [KEY]?: number };

export function synonymCacheVersion() {
  return (globalThis as GlobalCache)[KEY] || 0;
}

export function invalidateSynonymCache() {
  const cache = globalThis as GlobalCache;
  cache[KEY] = (cache[KEY] || 0) + 1;
}
