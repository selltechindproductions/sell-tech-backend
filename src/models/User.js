const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, match: [/\S+@\S+\.\S+/, 'is invalid'] },
    password: { type: String, required: true, minlength: 6, select: false }, // selected: false prevents it from being returned in queries
    
    // Profile Fields
    name: { type: String, default: '' },
    profile_pic: { type: String, default: '' },
    profession: { type: String, default: 'Unspecified' },
    
    // Device & App Data
    device_id: { type: String, default: '' },
    fcm_token: { type: String, default: '' },
    is_verified: { type: Boolean, default: false },
    
    // Role-Based Access Control
    user_role: { 
      type: String, 
      enum: ['user', 'admin', 'superadmin', 'content_creator'], 
      default: 'user' 
    },

    // Refresh Token Storage (For validating token rotation)
    refresh_token: { type: String, select: false }
  },
  { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field to map _id to user_id for Flutter frontend consistency
userSchema.virtual('user_id').get(function () {
  return this._id.toHexString();
});

// Pre-save hook to hash passwords automatically
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to check password validity
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);