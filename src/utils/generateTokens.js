const jwt = require('jsonwebtoken');

const generateTokens = (user) => {
  // Access Token (Short-lived, contains role for frontend logic)
  const accessToken = jwt.sign(
    { id: user._id, role: user.user_role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE }
  );

  // Refresh Token (Long-lived, used only to get a new Access Token)
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );

  return { accessToken, refreshToken };
};

module.exports = generateTokens;