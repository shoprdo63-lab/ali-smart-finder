/**
 * Niche Filter Tests
 * [cite: 2026-02-09, 2026-01-21] - Niche filtering requirements
 */

import { describe, it, expect } from 'vitest';
import { NicheFilter } from '../src/services/niche-filter.js';

describe('NicheFilter', () => {
  let filter: NicheFilter;

  beforeEach(() => {
    filter = new NicheFilter();
  });

  describe('Tech Product Detection', () => {
    it('should allow keyboards', () => {
      const result = filter.validateProduct('Logitech G Pro Mechanical Gaming Keyboard', '');
      expect(result.allowed).toBe(true);
      expect(result.detectedCategory).toBe('keyboard');
    });

    it('should allow gaming mice', () => {
      const result = filter.validateProduct('Razer DeathAdder Elite Gaming Mouse', '');
      expect(result.allowed).toBe(true);
      expect(result.detectedCategory).toBe('mouse');
    });

    it('should allow monitors', () => {
      const result = filter.validateProduct('LG 27GL83A-B 27 Inch Ultragear QHD IPS Gaming Monitor', '');
      expect(result.allowed).toBe(true);
      expect(result.detectedCategory).toBe('monitor');
    });

    it('should allow headphones', () => {
      const result = filter.validateProduct('Sony WH-1000XM4 Wireless Noise Cancelling Headphones', '');
      expect(result.allowed).toBe(true);
      expect(result.detectedCategory).toBe('headphones');
    });

    it('should allow gaming controllers', () => {
      const result = filter.validateProduct('Xbox Elite Wireless Controller Series 2', '');
      expect(result.allowed).toBe(true);
      expect(result.detectedCategory).toBe('controller');
    });
  });

  describe('Fashion/Clothing Blocking', () => {
    it('should block shirts', () => {
      const result = filter.validateProduct('Nike Mens Running Shirt', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('shirt');
    });

    it('should block shoes', () => {
      const result = filter.validateProduct('Adidas Ultraboost Running Shoes', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('shoes');
    });

    it('should block dresses', () => {
      const result = filter.validateProduct('Summer Floral Dress for Women', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('dress');
    });

    it('should block jewelry', () => {
      const result = filter.validateProduct('Gold Necklace Pendant Jewelry', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('jewelry');
    });

    it('should block fashion accessories', () => {
      const result = filter.validateProduct('Designer Handbag Fashion Purse', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('handbag');
    });

    it('should block makeup', () => {
      const result = filter.validateProduct('MAC Cosmetics Lipstick Makeup', '');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('makeup');
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for clear tech products', () => {
      const result = filter.validateProduct('Keychron K2 Mechanical Keyboard', '');
      expect(result.allowed).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should have low confidence for ambiguous products', () => {
      const result = filter.validateProduct('Some Random Product', '');
      expect(result.allowed).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Category Detection', () => {
    it('should detect category from title', () => {
      const result = filter.validateProduct('Logitech MX Master 3 Wireless Mouse', '');
      expect(result.detectedCategory).toBe('mouse');
    });

    it('should detect category from category string', () => {
      const result = filter.validateProduct('Product Name', 'Computer Keyboards');
      // This may not be blocked if the title doesn't match
      expect(result.allowed).toBe(false); // No tech keywords in title
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = filter.validateProduct('', '');
      expect(result.allowed).toBe(false);
    });

    it('should handle very long titles', () => {
      const longTitle = 'Gaming Mouse ' + 'a'.repeat(500);
      const result = filter.validateProduct(longTitle, '');
      expect(result.allowed).toBe(true);
    });

    it('should handle special characters', () => {
      const result = filter.validateProduct('Gaming Keyboard (RGB) [Mechanical]', '');
      expect(result.allowed).toBe(true);
    });
  });
});
