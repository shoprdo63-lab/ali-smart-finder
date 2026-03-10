/**
 * Simple AliExpress Search via HTTP
 * Fallback when official API doesn't work
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export async function searchAliExpressSimple(query) {
  try {
    logger.info(`Searching AliExpress for: ${query}`);
    
    // Use AliExpress search URL
    const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}&sortType=price_asc`;
    
    // For now, return search link that will show real results
    return {
      title: `${query}`,
      price: 0,
      originalPrice: 0,
      image: '',
      affiliateUrl: buildAffiliateLink(searchUrl),
      discount: 0,
      rating: 0,
      orders: 0,
      isSearch: true,
      searchUrl: searchUrl
    };
  } catch (error) {
    logger.error('Search error:', error);
    return null;
  }
}

function buildAffiliateLink(url) {
  const trackingId = process.env.ALI_TRACKING_ID || 'ali_smart_finder_v1';
  const encodedUrl = encodeURIComponent(url);
  return `https://s.click.aliexpress.com/deep_link.htm?aff_short_key=${trackingId}&dl_target_url=${encodedUrl}`;
}
