/**
 * Arbitrage Calculator Service
 * Calculates profit margins between Amazon and AliExpress
 */
export default class ArbitrageCalculator {
  constructor() {
    // Amazon referral fees by category
    this.amazonFees = {
      'electronics': 0.08,
      'computers': 0.06,
      'office-products': 0.15,
      'default': 0.15
    };

    // Fixed costs
    this.fbaFee = 5.00; // FBA fulfillment fee estimate
    this.shippingCostPerUnit = 3.50; // Average shipping from China
    this.packagingCost = 0.50;
  }

  /**
   * Calculate arbitrage opportunity
   * Formula: Amazon Price - AliExpress Price - Amazon Fees - Shipping = Net Profit
   */
  calculate(amazonProduct, aliExpressProduct) {
    if (!amazonProduct || !aliExpressProduct) {
      return null;
    }

    const amazonPrice = parseFloat(amazonProduct.price) || 0;
    const aliPrice = parseFloat(aliExpressProduct.salePrice) || 0;
    
    // Calculate costs
    const amazonFee = this.calculateAmazonFee(amazonPrice, amazonProduct.category);
    const totalCosts = aliPrice + amazonFee + this.shippingCostPerUnit + this.packagingCost;
    
    // Calculate profit
    const netProfit = amazonPrice - totalCosts;
    const profitMargin = (netProfit / amazonPrice) * 100;
    
    // Calculate profit score (1-10)
    const profitScore = this.calculateProfitScore(netProfit, profitMargin, aliExpressProduct);

    return {
      // Financials
      amazonPrice: amazonPrice,
      aliExpressPrice: aliPrice,
      amazonFee: amazonFee,
      shippingCost: this.shippingCostPerUnit,
      packagingCost: this.packagingCost,
      totalCost: totalCosts,
      
      // Profit metrics
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10) / 10,
      profitScore: profitScore,
      
      // Risk assessment
      riskLevel: this.assessRisk(profitMargin, aliExpressProduct),
      recommendation: this.getRecommendation(profitScore),
      
      // Color coding
      colorCode: this.getColorCode(profitScore),
      
      // Breakdown
      breakdown: {
        revenue: amazonPrice,
        productCost: aliPrice,
        amazonReferralFee: amazonFee,
        fulfillment: this.fbaFee,
        shipping: this.shippingCostPerUnit,
        packaging: this.packagingCost,
        netProfit: netProfit
      }
    };
  }

  /**
   * Calculate Amazon referral fee
   */
  calculateAmazonFee(price, category = 'default') {
    const feeRate = this.amazonFees[category] || this.amazonFees.default;
    // Minimum $0.30 per item
    return Math.max(price * feeRate, 0.30);
  }

  /**
   * Calculate profit score (1-10) based on multiple factors
   */
  calculateProfitScore(netProfit, profitMargin, aliProduct) {
    let score = 0;
    
    // Profit amount scoring (0-4 points)
    if (netProfit > 20) score += 4;
    else if (netProfit > 15) score += 3;
    else if (netProfit > 10) score += 2;
    else if (netProfit > 5) score += 1;
    
    // Margin percentage scoring (0-3 points)
    if (profitMargin > 50) score += 3;
    else if (profitMargin > 35) score += 2;
    else if (profitMargin > 20) score += 1;
    
    // Product reliability scoring (0-3 points)
    const orders = parseInt(aliProduct.orders) || 0;
    const rating = parseFloat(aliProduct.rating) || 0;
    
    if (orders > 5000) score += 1.5;
    else if (orders > 1000) score += 1;
    else if (orders > 500) score += 0.5;
    
    if (rating >= 4.5) score += 1.5;
    else if (rating >= 4.0) score += 1;
    else if (rating >= 3.5) score += 0.5;
    
    return Math.min(Math.max(Math.round(score), 1), 10);
  }

  /**
   * Assess risk level
   */
  assessRisk(profitMargin, aliProduct) {
    const orders = parseInt(aliProduct.orders) || 0;
    const rating = parseFloat(aliProduct.rating) || 0;
    
    if (profitMargin < 10 || rating < 3.5 || orders < 100) {
      return 'high';
    } else if (profitMargin < 25 || rating < 4.0 || orders < 500) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get recommendation text
   */
  getRecommendation(score) {
    if (score >= 8) return 'Excellent opportunity - High profit, reliable supplier';
    if (score >= 6) return 'Good opportunity - Solid margins, worth considering';
    if (score >= 4) return 'Moderate - Decent profit but check supplier carefully';
    if (score >= 2) return 'Risky - Low margins or uncertain supplier';
    return 'Avoid - Not profitable or too risky';
  }

  /**
   * Get color code for UI
   */
  getColorCode(score) {
    if (score >= 8) return '#48bb78'; // Green
    if (score >= 6) return '#68d391'; // Light green
    if (score >= 4) return '#ecc94b'; // Yellow
    if (score >= 2) return '#ed8936'; // Orange
    return '#fc8181'; // Red
  }

  /**
   * Batch calculate for multiple products
   */
  calculateBatch(amazonProduct, aliExpressProducts) {
    return aliExpressProducts.map(aliProduct => ({
      product: aliProduct,
      arbitrage: this.calculate(amazonProduct, aliProduct)
    })).sort((a, b) => (b.arbitrage?.profitScore || 0) - (a.arbitrage?.profitScore || 0));
  }
}
