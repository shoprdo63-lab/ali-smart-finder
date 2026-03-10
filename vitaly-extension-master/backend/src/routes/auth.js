import express from 'express';
import AuthService from '../services/authService.js';

const router = express.Router();
const authService = new AuthService();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, preferences } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }
    
    const result = await authService.register(email, password, { preferences });
    
    res.status(201).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required' }
      });
    }
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/oauth/google
 * Google OAuth login
 */
router.post('/oauth/google', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Authorization code is required' }
      });
    }
    
    const result = await authService.oauthGoogle(code);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/oauth/github
 * GitHub OAuth login
 */
router.post('/oauth/github', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Authorization code is required' }
      });
    }
    
    const result = await authService.oauthGitHub(code);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token is required' }
      });
    }
    
    const tokens = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = authService.verifyAccessToken(token);
        await authService.logout(decoded.userId);
      } catch (e) {
        // Token invalid, but logout anyway
      }
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * GET /api/auth/profile
 * Get user profile (protected)
 */
router.get('/profile', authService.middleware(), async (req, res) => {
  try {
    const profile = await authService.getProfile(req.user.userId);
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * PATCH /api/auth/profile
 * Update user preferences
 */
router.patch('/profile', authService.middleware(), async (req, res) => {
  try {
    const preferences = await authService.updatePreferences(req.user.userId, req.body);
    
    res.json({
      success: true,
      data: preferences
    });
    
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authService.middleware(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current and new password are required' }
      });
    }
    
    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email is required' }
      });
    }
    
    await authService.requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return success to prevent enumeration
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token and new password are required' }
      });
    }
    
    await authService.resetPassword(token, newPassword);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router;
