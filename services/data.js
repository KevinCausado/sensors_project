export class DataService {
  constructor() {
    this.cacheStore = useCacheStore();
  }

  async fetchWithCache(key, fetchFn, ttl = 300) {
    const cachedData = this.cacheStore.get(key);
    if (cachedData) return cachedData;

    const data = await fetchFn();
    this.cacheStore.set(key, data, ttl);
    return data;
  }

  async batchFetch(keys, fetchFn) {
    const results = new Map();
    const missingKeys = [];

    // Check cache first
    for (const key of keys) {
      const cached = this.cacheStore.get(key);
      if (cached) {
        results.set(key, cached);
      } else {
        missingKeys.push(key);
      }
    }

    // Fetch missing data
    if (missingKeys.length > 0) {
      const data = await fetchFn(missingKeys);
      for (const [key, value] of Object.entries(data)) {
        this.cacheStore.set(key, value);
        results.set(key, value);
      }
    }

    return Array.from(results.values());
  }
}

export const dataService = new DataService();