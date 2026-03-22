const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateTokens');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, name, profession, device_id, fcm_token, profile_pic } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or Username already exists' });
    }

    // Create User (Role defaults to 'user', is_verified defaults to false)
    const user = await User.create({
      username, email, password, name, profession, device_id, fcm_token, profile_pic
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database for validation later
    user.refresh_token = refreshToken;
    await user.save();

    // Strip password & refresh_token from response
    user.password = undefined;
    user.refresh_token = undefined;

    res.status(201).json({ success: true, accessToken, refreshToken, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, device_id, fcm_token } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Select password because it's hidden by default in the model
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update Device/FCM info if provided on login
    if (device_id) user.device_id = device_id;
    if (fcm_token) user.fcm_token = fcm_token;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    user.password = undefined;
    user.refresh_token = undefined;

    res.status(200).json({ success: true, accessToken, refreshToken, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get new Access Token using Refresh Token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    // Verify token cryptographic signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if user exists and token matches the one in DB (protects against revoked tokens)
    const user = await User.findById(decoded.id).select('+refresh_token');
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Issue new tokens (Token Rotation)
    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// @desc    Logout user (Invalidates Refresh Token)
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refresh_token: '' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};