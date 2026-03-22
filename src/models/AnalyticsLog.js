const mongoose = require('mongoose');

const analyticsLogSchema = new mongoose.Schema({
  section: { 
    type: String, 
    required: true, 
    enum: ['Post', 'Page', 'Product', 'About', 'Contact', 'Home'] 
  },
  // visitorId can be a User _id OR an IP address hash for guests
  visitorId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// IMPORTANT: Indexes for extremely fast aggregations on large datasets
analyticsLogSchema.index({ section: 1, timestamp: -1 });
analyticsLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AnalyticsLog', analyticsLogSchema);