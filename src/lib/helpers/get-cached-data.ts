import { cache } from '../utils/cache';
import { systemLogger } from '../utils/logger';

/**
 * Fetch data with caching and formatting
 * This function checks if the data is cached. If it is, it returns the cached data.
 * If not, it fetches the data using the provided fetchFunction, formats it using formatFunction,
 * and caches the result if in production mode.
 * @param {string} key - The cache key to store/retrieve data.
 * @param {Function} fetchFunction - The function to fetch data if not cached.
 * @param {Object} [options] - Additional options.
 * @returns {Promise<any>} - The cached or formatted data.
 */
async function getCachedData(key: string, fetchFunction: Function, formatFunction?: Function, options = {}) {
  const cachedData = cache.get(key);
  if (cachedData) {
    systemLogger.info(`Returning cached data for key: ${key}`);
    return cachedData;
  }

  systemLogger.info(`Cache miss for key: ${key}, fetching data`);

  const res = await fetchFunction();
  const data = res.data || res; // Handle both axios response and direct data
  const formattedData = formatFunction ? formatFunction(data) : data;
  cache.set(key, formattedData, options);
  systemLogger.info(`Data cached for key: ${key}`);
  systemLogger.info(`Returning data for key: ${key}`);

  return formattedData;
}

export default getCachedData;
