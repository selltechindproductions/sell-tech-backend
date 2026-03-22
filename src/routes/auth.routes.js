const express = require('express');
const { register, login, refreshToken, logout, getMe } = require('../controllers/auth.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public Routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected Routes (Requires Access Token)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// --- EXAMPLE OF ROLE-BASED ACCESS CONTROL ---
router.get('/admin-dashboard', protect, authorizeRoles('admin', 'superadmin'), (req, res) => {
  res.status(200).json({ success: true, message: 'Welcome to the Admin Area' });
});

module.exports = router;