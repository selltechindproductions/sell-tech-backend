const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true }, // Holds Quill HTML/Delta
    category: { type: String, required: true },
    scope: { type: String, required: true },
    price: { type: Number, default: 0.0 },
    status: { type: String, enum: ['Active', 'Draft', 'Retired'], default: 'Draft' },
    
    // Arrays
    imageUrls: [{ type: String }],
    features: [{ type: String }],
    techStack: [{ type: String }],
    tags: [{ type: String }],

    // SEO Configurations
    seo: {
      slug: { type: String, unique: true },
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: [{ type: String }],
    },
  },
  { timestamps: true } // Automatically manages createdAt and updatedAt!
);

module.exports = mongoose.model('Product', productSchema);