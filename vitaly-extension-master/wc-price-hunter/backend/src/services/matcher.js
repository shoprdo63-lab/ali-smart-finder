import { extractIdentifiers, normalizeTitle } from '../utils/normalize.js';
import { combinedSimilarity } from '../utils/levenshtein.js';

/**
 * Advanced Product Matching Engine
 * Matches products across platforms using multiple algorithms
 */
class ProductMatcher {
  constructor(threshold = 0.75) {
    this.threshold = threshold;
  }

  /**
   * Match a source product against candidate products
   * Returns best match with confidence score
   */
  matchProduct(sourceProduct, candidates) {
    if (!candidates || candidates.length === 0) {
      return {
        matched: false,
        bestDeal: null,
        confidence: 0,
        alternatives: []
      };
    }

    console.log(`\n🔍 Matching product: ${sourceProduct.title.substring(0, 50)}...`);
    
    // Extract identifiers from source
    const sourceIds = extractIdentifiers(sourceProduct.title);
    console.log(`📝 Source identifiers:`, {
      brand: sourceIds.brand,
      model: sourceIds.model,
      normalized: sourceIds.normalized.substring(0, 40) + '...'
    });

    // Score each candidate
    const scoredCandidates = candidates.map(candidate => {
      const score = this.calculateMatchScore(sourceIds, candidate);
      return {
        ...candidate,
        matchScore: score.total,
        matchDetails: score
      };
    });

    // Sort by match score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    // Log top matches
    console.log(`\n📊 Top 3 matches:`);
    scoredCandidates.slice(0, 3).forEach((c, i) => {
      console.log(`  ${i + 1}. Score: ${(c.matchScore * 100).toFixed(1)}% - ${c.title.substring(0, 40)}...`);
    });

    const bestMatch = scoredCandidates[0];
    const matched = bestMatch.matchScore >= this.threshold;

    if (matched) {
      console.log(`✅ MATCH FOUND! Confidence: ${(bestMatch.matchScore * 100).toFixed(1)}%`);
    } else {
      console.log(`❌ NO MATCH. Best score: ${(bestMatch.matchScore * 100).toFixed(1)}% (threshold: ${(this.threshold * 100)}%)`);
    }

    // Calculate total price including shipping
    const enrichedCandidates = scoredCandidates.map(c => ({
      ...c,
      totalPrice: this.calculateTotalPrice(c),
      savingsAmount: sourceProduct.price ? sourceProduct.price - this.calculateTotalPrice(c) : 0,
      savingsPercent: sourceProduct.price ? 
        Math.round(((sourceProduct.price - this.calculateTotalPrice(c)) / sourceProduct.price) * 100) : 0
    }));

    // Sort alternatives by total price
    const alternatives = enrichedCandidates
      .filter(c => c.matchScore >= this.threshold * 0.8) // Include near-matches
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 5);

    return {
      matched,
      bestDeal: matched ? enrichedCandidates[0] : null,
      confidence: bestMatch.matchScore,
      alternatives: alternatives.slice(1) // Exclude best deal from alternatives
    };
  }

  /**
   * Calculate comprehensive match score
   */
  calculateMatchScore(sourceIds, candidate) {
    const candidateIds = extractIdentifiers(candidate.title);
    
    let scores = {
      brand: 0,
      model: 0,
      title: 0,
      total: 0
    };

    // Brand matching (30% weight)
    if (sourceIds.brand && candidateIds.brand) {
      scores.brand = sourceIds.brand.toLowerCase() === candidateIds.brand.toLowerCase() ? 1.0 : 0.0;
    }

    // Model number matching (40% weight) - exact match required
    if (sourceIds.model && candidateIds.model) {
      scores.model = sourceIds.model.toLowerCase() === candidateIds.model.toLowerCase() ? 1.0 : 0.0;
    }

    // Title similarity (30% weight)
    scores.title = combinedSimilarity(sourceIds.normalized, candidateIds.normalized);

    // Calculate weighted total
    scores.total = (scores.brand * 0.3) + (scores.model * 0.4) + (scores.title * 0.3);

    return scores;
  }

  /**
   * Calculate total price including shipping
   */
  calculateTotalPrice(product) {
    const basePrice = parseFloat(product.salePrice || product.price || 0);
    const shipping = parseFloat(product.shippingCost || 0);
    return basePrice + shipping;
  }

  /**
   * Find cheaper alternatives on same platform (AliExpress)
   */
  findCheaperAlternatives(currentProduct, allListings) {
    if (!allListings || allListings.length === 0) {
      return {
        hasCheaper: false,
        cheapest: null,
        alternatives: []
      };
    }

    console.log(`\n🔍 Finding cheaper alternatives for: ${currentProduct.title.substring(0, 50)}...`);

    // Match current product against all listings
    const matchResult = this.matchProduct(currentProduct, allListings);

    if (!matchResult.matched) {
      console.log(`❌ No matching products found`);
      return {
        hasCheaper: false,
        cheapest: null,
        alternatives: []
      };
    }

    // Get current total price
    const currentTotal = this.calculateTotalPrice(currentProduct);
    
    // Filter for cheaper options
    const cheaperOptions = [matchResult.bestDeal, ...matchResult.alternatives]
      .filter(p => p && p.totalPrice < currentTotal)
      .sort((a, b) => a.totalPrice - b.totalPrice);

    const hasCheaper = cheaperOptions.length > 0;

    if (hasCheaper) {
      const savings = currentTotal - cheaperOptions[0].totalPrice;
      const savingsPercent = Math.round((savings / currentTotal) * 100);
      console.log(`✅ Found ${cheaperOptions.length} cheaper option(s)!`);
      console.log(`   Best savings: $${savings.toFixed(2)} (${savingsPercent}%)`);
    } else {
      console.log(`✅ Current listing is already the best price!`);
    }

    return {
      hasCheaper,
      cheapest: cheaperOptions[0] || null,
      alternatives: cheaperOptions.slice(1, 6), // Top 5 alternatives
      currentPrice: currentTotal,
      savings: hasCheaper ? currentTotal - cheaperOptions[0].totalPrice : 0,
      savingsPercent: hasCheaper ? 
        Math.round(((currentTotal - cheaperOptions[0].totalPrice) / currentTotal) * 100) : 0
    };
  }
}

export default ProductMatcher;
