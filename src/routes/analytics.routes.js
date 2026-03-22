const express = require('express');
const { getDashboardStats } = require('../controllers/analytics.controller');
const { getChartPerformance } = require('../controllers/chart.controller'); // Import our new controller
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'superadmin'));

// Existing Stats Route
router.get('/dashboard', getDashboardStats);

// New Chart Route
router.get('/charts', getChartPerformance);

module.exports = router;