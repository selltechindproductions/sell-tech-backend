const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateTokens');
const asyncHandler = require('../utils/asyncHandler');

// ================= REGISTER =================
const register = asyncHandler(async (req, res) => {
  const {
    username,
    email,
    password,
    name,
    profession,
    device_id,
    fcm_token,
    profile_pic,
  } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username, email, and password are required',
    });
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email or Username already exists',
    });
  }

  const user = await User.create({
    username,
    email,
    password,
    name: name || username,
    profession: profession || 'Unspecified',
    device_id: device_id || '',
    fcm_token: fcm_token || '',
    profile_pic: profile_pic || '',
  });

  const { accessToken, refreshToken } = generateTokens(user);

  user.refresh_token = refreshToken;
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  delete userData.refresh_token;

  res.status(201).json({
    success: true,
    accessToken,
    refreshToken,
    user: userData,
  });
});

// ================= LOGIN =================
const login = asyncHandler(async (req, res) => {
  const { email, password, device_id, fcm_token } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  if (device_id) user.device_id = device_id;
  if (fcm_token) user.fcm_token = fcm_token;

  const { accessToken, refreshToken } = generateTokens(user);

  user.refresh_token = refreshToken;
  await user.save();

  const userData = user.toObject();
  delete userData.password;
  delete userData.refresh_token;

  res.status(200).json({
    success: true,
    accessToken,
    refreshToken,
    user: userData,
  });
});

// ================= REFRESH =================
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: reqToken } = req.body;

  if (!reqToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  const decoded = jwt.verify(reqToken, process.env.JWT_REFRESH_SECRET);

  const user = await User.findById(decoded.id).select('+refresh_token');

  if (!user || user.refresh_token !== reqToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }

  const tokens = generateTokens(user);

  user.refresh_token = tokens.refreshToken;
  await user.save();

  res.status(200).json({
    success: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

// ================= LOGOUT =================
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    refresh_token: '',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// ================= GET ME =================
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
};