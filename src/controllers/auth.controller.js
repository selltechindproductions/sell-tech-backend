const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateTokens');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, name, profession, device_id, fcm_token, profile_pic } = req.body;

    // 1. Explicitly check for required fields to prevent Mongoose validation crashes
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or Username already exists' });
    }

    // 3. Create User
    const user = await User.create({
      username, 
      email, 
      password, 
      name: name || username, 
      profession, 
      device_id, 
      fcm_token, 
      profile_pic
    });

    // 4. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // 5. Save refresh token to database
    user.refresh_token = refreshToken;
    await user.save();

    // 6. Safely strip sensitive data before sending back to Flutter
    const userData = user.toObject();
    delete userData.password;
    delete userData.refresh_token;

    res.status(201).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: userData 
    });
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

    // 1. Fetch user and explicitly select the hidden password field for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2. Update Device/FCM info if provided on login
    if (device_id) user.device_id = device_id;
    if (fcm_token) user.fcm_token = fcm_token;

    // 3. Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    // 4. Safely strip sensitive data
    const userData = user.toObject();
    delete userData.password;
    delete userData.refresh_token;

    res.status(200).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: userData 
    });
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

    // 1. Verify token cryptographic signature
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 2. Check if user exists and token matches the one in DB (protects against revoked tokens)
    const user = await User.findById(decoded.id).select('+refresh_token');
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // 3. Issue new tokens (Token Rotation)
    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    // Catch block handles jwt.verify() failing (e.g., token expired or tampered)
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// @desc    Logout user (Invalidates Refresh Token)
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // By emptying the refresh token, the user will be forced to log in again once the access token dies
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
    // Because this is protected by middleware, req.user already exists.
    // We just fetch the fresh data from the DB to return it.
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};