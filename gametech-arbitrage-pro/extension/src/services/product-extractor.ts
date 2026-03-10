/**
 * Product Extractor - Extract Amazon product data from page
 * [cite: 2026-02-26] - Product detection requirements
 */

export interface ProductData {
  asin: string;
  title: string;
  price: number;
  image: string;
  category: string;
  images: string[];
}

export class ProductExtractor {
  /**
   * Extract product data from Amazon page
   */
  extract(): ProductData | null {
    try {
      // Extract ASIN
      const asin = this.extractASIN();
      if (!asin) {
        console.log('[ProductExtractor] No ASIN found');
        return null;
      }

      // Extract title
      const title = this.extractTitle();
      if (!title) {
        console.log('[ProductExtractor] No title found');
        return null;
      }

      // Extract price
      const price = this.extractPrice();

      // Extract images
      const images = this.extractImages();
      const mainImage = images[0] || '';

      // Extract category
      const category = this.extractCategory();

      return {
        asin,
        title,
        price,
        image: mainImage,
        category,
        images,
      };
    } catch (error) {
      console.error('[ProductExtractor] Error:', error);
      return null;
    }
  }

  /**
   * Extract ASIN from URL or page
   */
  private extractASIN(): string | null {
    // Try URL first
    const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (urlMatch) return urlMatch[1];

    // Try data-asin attribute
    const asinEl = document.querySelector('[data-asin]');
    if (asinEl) {
      const asin = asinEl.getAttribute('data-asin');
      if (asin && asin.match(/^[A-Z0-9]{10}$/)) return asin;
    }

    // Try input field
    const inputASIN = document.querySelector('input[name="ASIN"]') as HTMLInputElement;
    if (inputASIN?.value) return inputASIN.value;

    // Try meta tag
    const metaASIN = document.querySelector('meta[property="og:asin"]') as HTMLMetaElement;
    if (metaASIN?.content) return metaASIN.content;

    return null;
  }

  /**
   * Extract product title
   */
  private extractTitle(): string | null {
    const selectors = [
      '#productTitle',
      '[data-automation-id="title"]',
      'h1.a-size-large:not(.a-text-ellipsis)',
      '#title',
      'h1.a-size-extra-large',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return this.cleanText(el.textContent.trim());
      }
    }

    return null;
  }

  /**
   * Extract product price
   */
  private extractPrice(): number {
    const priceSelectors = [
      '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
      '.a-price .a-offscreen',
      '.a-price-whole',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-to-pay .a-offscreen',
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        const price = this.parsePrice(el.textContent);
        if (price > 0) return price;
      }
    }

    return 0;
  }

  /**
   * Extract all product images
   */
  private extractImages(): string[] {
    const images: string[] = [];

    // Main image
    const mainImg = document.querySelector('#landingImage, #imgBlkFront') as HTMLImageElement;
    if (mainImg?.src) {
      images.push(this.cleanImageUrl(mainImg.src));
    }

    // Thumbnail images
    const thumbSelectors = [
      '#altImages img',
      '.imageThumbnail img',
      '[data-cel-widget="main-image"] img',
    ];

    for (const selector of thumbSelectors) {
      document.querySelectorAll(selector).forEach((img) => {
        const src = (img as HTMLImageElement).src || (img as HTMLImageElement).dataset.src;
        if (src && !src.includes('spinner')) {
          const cleaned = this.cleanImageUrl(src);
          if (!images.includes(cleaned)) {
            images.push(cleaned);
          }
        }
      });
    }

    return images.slice(0, 20); // Limit to 20 images
  }

  /**
   * Extract category from breadcrumb
   */
  private extractCategory(): string {
    const breadcrumbSelectors = [
      '#wayfinding-breadcrumbs_feature_div .a-link-normal',
      '.a-breadcrumb .a-link-normal',
      '[data-testid="breadcrumb-list"] a',
    ];

    for (const selector of breadcrumbSelectors) {
      const links = document.querySelectorAll(selector);
      for (const link of Array.from(links)) {
        const text = link.textContent?.trim().toLowerCase();
        if (text) {
          if (text.includes('keyboard')) return 'keyboard';
          if (text.includes('mouse')) return 'mouse';
          if (text.includes('monitor')) return 'monitor';
          if (text.includes('headphone')) return 'headphones';
          if (text.includes('microphone')) return 'microphone';
          if (text.includes('webcam')) return 'webcam';
          if (text.includes('controller')) return 'controller';
          if (text.includes('graphics') || text.includes('gpu')) return 'pc-parts';
        }
      }
    }

    return '';
  }

  /**
   * Parse price text to number
   */
  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^\d.]/g, '');
    const match = cleaned.match(/\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Clean image URL to high-res
   */
  private cleanImageUrl(url: string): string {
    // Replace low-res with high-res
    return url
      .replace(/_SS\d+_/, '_SL1500_')
      .replace(/_SX\d+_/, '_SL1500_')
      .replace(/_SY\d+_/, '_SL1500_')
      .replace(/_CR\d+,\d+,\d+,\d+_/, '');
  }

  /**
   * Clean text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();
  }
}
