const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'is invalid'] 
    },
    phone: { type: String, default: '' },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { 
    timestamps: true, // Automatically creates 'createdAt' and 'updatedAt'
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

module.exports = mongoose.model('ContactMessage', contactMessageSchema);