import { LRUCache } from 'lru-cache';
import { systemLogger } from './logger';

const baseOptions: LRUCache<any, any, unknown> | LRUCache.Options<any, any, unknown> = {
  max: 100,
  dispose: (value, key, reason) => {
    systemLogger.info(`Removing ${key} from cache`);
    systemLogger.info(`Reason: ${reason}`);
  },

  onInsert: (value, key) => {
    systemLogger.info(`Inserting ${key} with value to cache`);
  },

  ttl: 1000 * 60 * 5, // 5 minutes

  allowStale: false,

  updateAgeOnGet: false,
  updateAgeOnHas: false,
};

export const cache = new LRUCache(baseOptions);
