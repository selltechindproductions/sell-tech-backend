const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, default: 'Uncategorized' },
    imageUrls: [{ type: String }],
    status: { 
      type: String, 
      enum: ['Draft', 'Published', 'Archived'], 
      default: 'Draft' 
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // SEO Settings
    slug: { type: String, required: true, unique: true, lowercase: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }],

    // Tracking & Analytics
    views: { type: Number, default: 0 }, // Total page hits
    visitors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Unique logged-in visitors

    // Interactions
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
  },
  { 
    timestamps: true, // Automatically handles createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for getting the count of unique visitors
blogSchema.virtual('uniqueVisitorCount').get(function() {
  return this.visitors.length;
});

// Virtual for getting the count of likes
blogSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

module.exports = mongoose.model('Blog', blogSchema);