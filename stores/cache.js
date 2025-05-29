import { defineStore } from 'pinia';

export const useCacheStore = defineStore('cache', {
  state: () => ({
    cache: new Map(),
    ttl: new Map()
  }),

  actions: {
    set(key, value, ttlSeconds = 300) {
      this.cache.set(key, value);
      this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
    },

    get(key) {
      if (!this.cache.has(key)) return null;
      if (Date.now() > this.ttl.get(key)) {
        this.cache.delete(key);
        this.ttl.delete(key);
        return null;
      }
      return this.cache.get(key);
    },

    clear() {
      this.cache.clear();
      this.ttl.clear();
    },

    clearExpired() {
      for (const [key, expiry] of this.ttl.entries()) {
        if (Date.now() > expiry) {
          this.cache.delete(key);
          this.ttl.delete(key);
        }
      }
    }
  }
});