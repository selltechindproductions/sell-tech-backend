// src/middlewares/tracking.middleware.js
const AnalyticsLog = require('../models/AnalyticsLog');
const crypto = require('crypto');

exports.trackPageView = (section) => async (req, res, next) => {
  try {
    // If logged in, use their User ID. If guest, hash their IP address to act as a unique visitor ID.
    const visitorId = req.user 
      ? req.user.id 
      : crypto.createHash('md5').update(req.ip || 'unknown').digest('hex');

    // Fire and forget (don't await) so it doesn't slow down the API response time
    AnalyticsLog.create({ section, visitorId }).catch(err => console.error('Tracking Error:', err));
    
  } catch (error) {
    // Fail silently, tracking shouldn't break the app
  }
  next();
};