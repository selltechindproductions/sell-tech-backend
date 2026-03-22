const express = require('express');
const { sendNotification, getNotifications } = require('../controllers/notification.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorizeRoles('admin', 'superadmin'));

// Fetch history
router.get('/', getNotifications);

// Send a new blast
router.post('/send', sendNotification);

module.exports = router;