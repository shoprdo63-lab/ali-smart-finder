/**
 * API Routes Tests
 * [cite: 2026-02-26] - Backend API requirements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('API Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/v1/find', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/find')
        .send({
          asin: 'INVALID',
          title: 'ab',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should process valid tech product', async () => {
      const response = await request(app)
        .post('/api/v1/find')
        .send({
          asin: 'B08N5WRWNW',
          title: 'Logitech G Pro X Gaming Keyboard',
          price: 129.99,
          category: 'gaming',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject fashion products', async () => {
      const response = await request(app)
        .post('/api/v1/find')
        .send({
          asin: 'B08N5WRWNW',
          title: 'Nike Running Shoes Fashion',
          price: 99.99,
          category: 'clothing',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.reason).toContain('not supported');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return extended health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
