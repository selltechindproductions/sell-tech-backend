const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    target: { type: String, default: 'all' }, // e.g., 'all', 'android', 'ios', or a user ID
    status: { 
      type: String, 
      enum: ['Sent', 'Failed', 'Draft', 'Partial Success'], 
      default: 'Sent' 
    },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
  },
  { 
    timestamps: { createdAt: 'sentAt', updatedAt: 'updatedAt' }, // Maps to your Flutter sentAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

module.exports = mongoose.model('Notification', notificationSchema);