/**
 * Backend API Communication Layer
 * Handles all requests to the backend server
 */

const API_BASE_URL = 'http://localhost:3000';

class BackendAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Match Amazon product with AliExpress
   */
  async matchAmazonProduct(productData) {
    try {
      console.log('🔍 Matching Amazon product with AliExpress...');
      
      const response = await fetch(`${this.baseUrl}/api/match-amazon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Match result:', data.matched ? 'FOUND' : 'NOT FOUND');
      
      return data;

    } catch (error) {
      console.error('❌ API error:', error);
      throw error;
    }
  }

  /**
   * Find cheaper alternatives on AliExpress
   */
  async findCheaperAlternatives(productData) {
    try {
      console.log('🔍 Finding cheaper alternatives on AliExpress...');
      
      const response = await fetch(`${this.baseUrl}/api/match-aliexpress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Search result:', data.hasCheaper ? 'CHEAPER FOUND' : 'BEST PRICE');
      
      return data;

    } catch (error) {
      console.error('❌ API error:', error);
      throw error;
    }
  }

  /**
   * Check backend health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const api = new BackendAPI();
