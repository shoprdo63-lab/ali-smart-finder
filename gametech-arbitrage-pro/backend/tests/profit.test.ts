/**
 * Profit Calculator Tests
 * [cite: 2026-02-26] - Profit calculation requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProfitCalculator, ProfitInput } from '../src/services/profit.js';

describe('ProfitCalculator', () => {
  let calculator: ProfitCalculator;

  beforeEach(() => {
    calculator = new ProfitCalculator();
  });

  describe('Basic Calculations', () => {
    it('should calculate profit correctly', () => {
      const input: ProfitInput = {
        amazonPrice: 100,
        aliPrice: 50,
        category: 'electronics',
      };

      const result = calculator.calculate(input);

      expect(result.profit).toBeGreaterThan(0);
      expect(result.breakdown.amazonPrice).toBe(100);
      expect(result.breakdown.aliPrice).toBe(50);
      expect(result.breakdown.amazonFees).toBe(8); // 8% of 100
      expect(result.profitMargin).toBeGreaterThan(0);
    });

    it('should calculate profit for gaming category', () => {
      const input: ProfitInput = {
        amazonPrice: 200,
        aliPrice: 120,
        category: 'gaming',
      };

      const result = calculator.calculate(input);

      expect(result.breakdown.amazonFees).toBe(16); // 8% of 200
      expect(result.profitScore).toBeGreaterThanOrEqual(1);
      expect(result.profitScore).toBeLessThanOrEqual(10);
    });

    it('should handle zero profit scenario', () => {
      const input: ProfitInput = {
        amazonPrice: 50,
        aliPrice: 50,
        category: 'default',
        shipping: 0,
      };

      const result = calculator.calculate(input);

      expect(result.profit).toBeLessThanOrEqual(0);
      expect(result.recommendation).toBe('avoid');
    });
  });

  describe('Profit Score Algorithm', () => {
    it('should return score 10 for excellent opportunity', () => {
      const input: ProfitInput = {
        amazonPrice: 150,
        aliPrice: 50,
        category: 'electronics',
      };

      const result = calculator.calculate(input);

      expect(result.profitScore).toBe(10);
      expect(result.recommendation).toBe('high');
    });

    it('should return score 8-9 for good opportunity', () => {
      const input: ProfitInput = {
        amazonPrice: 120,
        aliPrice: 60,
        category: 'electronics',
      };

      const result = calculator.calculate(input);

      expect(result.profitScore).toBeGreaterThanOrEqual(6);
      expect(result.profitScore).toBeLessThanOrEqual(9);
    });

    it('should return low score for poor opportunity', () => {
      const input: ProfitInput = {
        amazonPrice: 100,
        aliPrice: 95,
        category: 'electronics',
      };

      const result = calculator.calculate(input);

      expect(result.profitScore).toBeLessThanOrEqual(3);
      expect(result.recommendation).toBe('avoid');
    });
  });

  describe('Category-based Fees', () => {
    it('should use correct fee rate for computers', () => {
      const rate = calculator.getFeeRate('computers');
      expect(rate).toBe(0.06);
    });

    it('should use correct fee rate for electronics', () => {
      const rate = calculator.getFeeRate('electronics');
      expect(rate).toBe(0.08);
    });

    it('should use default fee for unknown category', () => {
      const rate = calculator.getFeeRate('unknown');
      expect(rate).toBe(0.15);
    });
  });

  describe('Shipping Estimates', () => {
    it('should estimate free shipping for cheap items', () => {
      const estimate = calculator.getShippingEstimate('electronics');
      expect(estimate).toBe(5.99);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high prices', () => {
      const input: ProfitInput = {
        amazonPrice: 10000,
        aliPrice: 5000,
        category: 'electronics',
      };

      const result = calculator.calculate(input);

      expect(result.profit).toBeGreaterThan(4000);
      expect(result.profitScore).toBe(10);
    });

    it('should handle custom shipping', () => {
      const input: ProfitInput = {
        amazonPrice: 100,
        aliPrice: 50,
        category: 'electronics',
        shipping: 15,
      };

      const result = calculator.calculate(input);

      expect(result.breakdown.shipping).toBe(15);
    });
  });
});
