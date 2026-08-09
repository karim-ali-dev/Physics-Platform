const MAX_ENTRIES = 500;

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCached(key, data, ttlMs = 30000) {
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    let oldestKey = null;
    let oldestTs = Infinity;
    for (const [k, v] of cache) {
      if (v.expires < oldestTs) { oldestTs = v.expires; oldestKey = k; }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

function clearCache() {
  cache.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key);
  }
}, 60000).unref();

module.exports = { getCached, setCached, clearCache };
