/**
 * Profit Calculation Service
 * Implements profit formula and scoring algorithm
 * [cite: 2026-02-26, 2026-01-25] - Backend logic and profit calculation
 */

export interface ProfitInput {
  amazonPrice: number;
  aliPrice: number;
  category: string;
  shipping?: number;
}

export interface ProfitResult {
  profit: number;
  profitMargin: number;
  profitScore: number;
  breakdown: {
    amazonPrice: number;
    aliPrice: number;
    amazonFees: number;
    shipping: number;
    netProfit: number;
  };
  recommendation: 'high' | 'medium' | 'low' | 'avoid';
}

export class ProfitCalculator {
  // Amazon referral fees by category
  private readonly amazonFees: Record<string, number> = {
    electronics: 0.08,
    computers: 0.06,
    'office-products': 0.15,
    gaming: 0.08,
    'video-games': 0.08,
    'camera-photo': 0.08,
    headphones: 0.08,
    default: 0.15,
  };

  // Shipping estimates by category
  private readonly shippingEstimates: Record<string, number> = {
    electronics: 5.99,
    computers: 8.99,
    gaming: 6.99,
    headphones: 4.99,
    accessories: 3.99,
    default: 5.99,
  };

  /**
   * Calculate profit and score
   * Formula: Profit = AmazonPrice - AliPrice - (15% of AmazonPrice as fees) - Shipping
   */
  calculate(input: ProfitInput): ProfitResult {
    const { amazonPrice, aliPrice, category } = input;
    
    // Get fee rate for category
    const feeRate = this.amazonFees[category.toLowerCase()] || this.amazonFees.default;
    const amazonFees = amazonPrice * feeRate;
    
    // Get shipping estimate
    const shipping = input.shipping || this.shippingEstimates[category.toLowerCase()] || this.shippingEstimates.default;
    
    // Calculate net profit
    const netProfit = amazonPrice - aliPrice - amazonFees - shipping;
    
    // Calculate profit margin
    const profitMargin = amazonPrice > 0 ? (netProfit / amazonPrice) * 100 : 0;
    
    // Calculate profit score (1-10)
    const profitScore = this.calculateScore(netProfit, profitMargin);
    
    // Determine recommendation
    const recommendation = this.getRecommendation(profitScore, netProfit);
    
    return {
      profit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      profitScore,
      breakdown: {
        amazonPrice: Math.round(amazonPrice * 100) / 100,
        aliPrice: Math.round(aliPrice * 100) / 100,
        amazonFees: Math.round(amazonFees * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      },
      recommendation,
    };
  }

  /**
   * Calculate profit score (1-10)
   * Algorithm:
   * - margin% >= 40% and Profit >= $50 -> 10
   * - margin% >= 30% and Profit >= $30 -> 8-9
   * - margin% >= 20% and Profit >= $15 -> 6-7
   * - else compute proportional score down to 1
   */
  private calculateScore(profit: number, margin: number): number {
    // Excellent opportunity
    if (margin >= 40 && profit >= 50) return 10;
    if (margin >= 35 && profit >= 40) return 9;
    if (margin >= 30 && profit >= 30) return 8;
    
    // Good opportunity
    if (margin >= 25 && profit >= 25) return 7;
    if (margin >= 20 && profit >= 15) return 6;
    
    // Moderate opportunity
    if (margin >= 15 && profit >= 10) return 5;
    if (margin >= 12 && profit >= 8) return 4;
    
    // Weak opportunity
    if (margin >= 8 && profit >= 5) return 3;
    if (margin >= 5 && profit >= 3) return 2;
    
    // Poor opportunity
    return 1;
  }

  /**
   * Get recommendation based on score
   */
  private getRecommendation(score: number, profit: number): 'high' | 'medium' | 'low' | 'avoid' {
    if (score >= 8 && profit > 30) return 'high';
    if (score >= 5 && profit > 10) return 'medium';
    if (score >= 3 && profit > 0) return 'low';
    return 'avoid';
  }

  /**
   * Batch calculate for multiple products
   */
  batchCalculate(inputs: ProfitInput[]): ProfitResult[] {
    return inputs.map(input => this.calculate(input));
  }

  /**
   * Get fee rate for category
   */
  getFeeRate(category: string): number {
    return this.amazonFees[category.toLowerCase()] || this.amazonFees.default;
  }

  /**
   * Get shipping estimate for category
   */
  getShippingEstimate(category: string): number {
    return this.shippingEstimates[category.toLowerCase()] || this.shippingEstimates.default;
  }
}
