/**
 * Logger utility for extension
 */

export const logger = {
  info: (...args: any[]) => {
    console.log('[GameTech Arbitrage]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[GameTech Arbitrage]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[GameTech Arbitrage]', ...args);
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[GameTech Arbitrage]', ...args);
    }
  },
};
