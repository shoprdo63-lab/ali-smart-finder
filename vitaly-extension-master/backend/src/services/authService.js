/**
 * Authentication Service
 * JWT + OAuth (Google, GitHub) implementation
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const Redis = require('ioredis');

class AuthService {
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'alismart',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    this.ACCESS_TOKEN_EXPIRY = '15m';
    this.REFRESH_TOKEN_EXPIRY = '7d';
    this.REFRESH_TOKEN_DAYS = 7;
  }

  /**
   * Register new user with email/password
   */
  async register(email, password, metadata = {}) {
    // Validate email
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if email exists
    const existing = await this.db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length) {
      throw new Error('Email already registered');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const userId = this.generateId();
    const result = await this.db.query(
      `INSERT INTO users (id, email, password_hash, preferences, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, created_at`,
      [userId, email.toLowerCase(), hashedPassword, JSON.stringify(metadata.preferences || {})]
    );
    
    const user = result.rows[0];
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at
      },
      ...tokens
    };
  }

  /**
   * Login with email/password
   */
  async login(email, password) {
    // Find user
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1 AND active = true',
      [email.toLowerCase()]
    );
    
    if (!result.rows.length) {
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      // Increment failed attempts
      await this.incrementFailedAttempts(user.id);
      throw new Error('Invalid credentials');
    }
    
    // Check if account is locked
    if (user.failed_attempts >= 5) {
      throw new Error('Account temporarily locked. Please try again later.');
    }
    
    // Reset failed attempts
    await this.resetFailedAttempts(user.id);
    
    // Update last login
    await this.db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences,
        createdAt: user.created_at
      },
      ...tokens
    };
  }

  /**
   * OAuth login/register (Google)
   */
  async oauthGoogle(code) {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Google code');
    }
    
    // Get user info
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
    );
    
    const googleUser = await userResponse.json();
    
    return this.handleOAuthUser('google', googleUser.id, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    });
  }

  /**
   * OAuth login/register (GitHub)
   */
  async oauthGitHub(code) {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok || tokens.error) {
      throw new Error(tokens.error_description || 'Failed to exchange GitHub code');
    }
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    const githubUser = await userResponse.json();
    
    // Get email (might be private)
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      const emails = await emailsResponse.json();
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }
    
    return this.handleOAuthUser('github', githubUser.id.toString(), {
      email,
      name: githubUser.name || githubUser.login,
      picture: githubUser.avatar_url,
      username: githubUser.login
    });
  }

  /**
   * Handle OAuth user (create or login)
   */
  async handleOAuthUser(provider, providerId, profile) {
    // Check if user exists with this OAuth
    let result = await this.db.query(
      `SELECT u.* FROM users u
       JOIN oauth_accounts oa ON u.id = oa.user_id
       WHERE oa.provider = $1 AND oa.provider_id = $2`,
      [provider, providerId]
    );
    
    let user;
    
    if (result.rows.length) {
      user = result.rows[0];
      
      // Update OAuth profile
      await this.db.query(
        `UPDATE oauth_accounts 
         SET profile = $1, updated_at = NOW()
         WHERE provider = $2 AND provider_id = $3`,
        [JSON.stringify(profile), provider, providerId]
      );
    } else {
      // Check if email exists (link accounts)
      if (profile.email) {
        const existing = await this.db.query(
          'SELECT * FROM users WHERE email = $1',
          [profile.email.toLowerCase()]
        );
        
        if (existing.rows.length) {
          user = existing.rows[0];
          
          // Link OAuth to existing account
          await this.db.query(
            `INSERT INTO oauth_accounts (id, user_id, provider, provider_id, profile)
             VALUES ($1, $2, $3, $4, $5)`,
            [this.generateId(), user.id, provider, providerId, JSON.stringify(profile)]
          );
        }
      }
      
      if (!user) {
        // Create new user
        const userId = this.generateId();
        user = {
          id: userId,
          email: profile.email || `${providerId}@${provider}.oauth`,
          preferences: { name: profile.name, picture: profile.picture }
        };
        
        await this.db.query(
          `INSERT INTO users (id, email, preferences, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [user.id, user.email, JSON.stringify(user.preferences)]
        );
        
        // Create OAuth link
        await this.db.query(
          `INSERT INTO oauth_accounts (id, user_id, provider, provider_id, profile)
           VALUES ($1, $2, $3, $4, $5)`,
          [this.generateId(), user.id, provider, providerId, JSON.stringify(profile)]
        );
      }
    }
    
    // Update last login
    await this.db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences
      },
      ...tokens,
      isNewUser: !result.rows.length
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      type: 'access'
    };
    
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'alismart-finder',
      audience: 'alismart-extension'
    });
    
    const refreshPayload = {
      userId: user.id,
      type: 'refresh',
      tokenId: this.generateId()
    };
    
    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'alismart-finder'
    });
    
    // Store refresh token in Redis for revocation capability
    await this.redis.setex(
      `refresh_token:${refreshPayload.tokenId}`,
      this.REFRESH_TOKEN_DAYS * 24 * 60 * 60,
      JSON.stringify({
        userId: user.id,
        createdAt: new Date()
      })
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);
      
      // Check if token is revoked
      const stored = await this.redis.get(`refresh_token:${decoded.tokenId}`);
      
      if (!stored) {
        throw new Error('Token revoked');
      }
      
      // Get user
      const result = await this.db.query(
        'SELECT id, email FROM users WHERE id = $1 AND active = true',
        [decoded.userId]
      );
      
      if (!result.rows.length) {
        throw new Error('User not found');
      }
      
      // Generate new tokens (rotate refresh token)
      const tokens = await this.generateTokens(result.rows[0]);
      
      // Revoke old refresh token
      await this.revokeRefreshToken(decoded.tokenId);
      
      return tokens;
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId) {
    await this.redis.del(`refresh_token:${tokenId}`);
  }

  /**
   * Logout user (revoke all tokens)
   */
  async logout(userId) {
    // Get all refresh tokens for user and revoke them
    // This is a simplified version - in production, track all tokens per user
    await this.redis.del(`user_sessions:${userId}`);
    
    return { success: true };
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const result = await this.db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (!result.rows.length) {
      throw new Error('User not found');
    }
    
    // Verify current password
    if (result.rows[0].password_hash) {
      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    // Hash and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await this.db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    // Revoke all existing sessions
    await this.logout(userId);
    
    return { success: true };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    const result = await this.db.query(
      'SELECT id FROM users WHERE email = $1 AND active = true',
      [email.toLowerCase()]
    );
    
    if (!result.rows.length) {
      // Don't reveal if email exists
      return { success: true };
    }
    
    const userId = result.rows[0].id;
    const resetToken = this.generateId();
    
    // Store reset token (valid for 1 hour)
    await this.redis.setex(
      `password_reset:${resetToken}`,
      3600,
      userId
    );
    
    // Send email with reset link
    // TODO: Integrate with email service
    console.log(`Password reset link: https://alismart-finder.com/reset-password?token=${resetToken}`);
    
    return { success: true };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const userId = await this.redis.get(`password_reset:${token}`);
    
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }
    
    // Validate password
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    // Hash and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await this.db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    // Delete reset token
    await this.redis.del(`password_reset:${token}`);
    
    // Revoke all sessions
    await this.logout(userId);
    
    return { success: true };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const result = await this.db.query(
      `SELECT u.id, u.email, u.preferences, u.created_at, u.last_login,
              array_agg(json_build_object(
                'provider', oa.provider,
                'connected_at', oa.created_at
              )) FILTER (WHERE oa.id IS NOT NULL) as oauth_accounts
       FROM users u
       LEFT JOIN oauth_accounts oa ON u.id = oa.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    
    if (!result.rows.length) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    return {
      id: user.id,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      oauthAccounts: user.oauth_accounts || []
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId, preferences) {
    // Get current preferences
    const result = await this.db.query(
      'SELECT preferences FROM users WHERE id = $1',
      [userId]
    );
    
    if (!result.rows.length) {
      throw new Error('User not found');
    }
    
    const currentPrefs = result.rows[0].preferences || {};
    const updatedPrefs = { ...currentPrefs, ...preferences };
    
    await this.db.query(
      'UPDATE users SET preferences = $1 WHERE id = $2',
      [JSON.stringify(updatedPrefs), userId]
    );
    
    return updatedPrefs;
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(userId) {
    await this.db.query(
      `UPDATE users 
       SET failed_attempts = failed_attempts + 1, 
           locked_until = CASE WHEN failed_attempts >= 4 THEN NOW() + INTERVAL '30 minutes' ELSE locked_until END
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(userId) {
    await this.db.query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Middleware for protecting routes
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        const decoded = this.verifyAccessToken(token);
        
        req.user = decoded;
        next();
        
      } catch (error) {
        return res.status(401).json({ error: error.message });
      }
    };
  }

  async close() {
    await this.db.end();
    await this.redis.quit();
  }
}

module.exports = AuthService;
