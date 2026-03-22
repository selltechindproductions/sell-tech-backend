const Product = require('../models/product');

// Helper to create an SEO-friendly slug
const generateSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// Helper to parse comma-separated strings into arrays (required for form-data)
const parseArray = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  return field.split(',').map(item => item.trim());
};

// @desc    Get all products (Handles Public & Admin Views)
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const { status, category, scope, search } = req.query;
    let query = {};

    // 1. Role-Based Visibility
    // If user is a guest or a standard user, ONLY show 'Active' products.
    if (!req.user || (req.user.user_role !== 'admin' && req.user.user_role !== 'superadmin')) {
      query.status = 'Active';
    } else if (status) {
      // Admins can filter by specific status
      query.status = status;
    }

    // 2. Applied Filters
    if (category && category !== 'All') query.category = category;
    if (scope && scope !== 'All') query.scope = scope;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single product by Slug
// @route   GET /api/v1/products/:slug
// @access  Public
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Security: Don't show Draft/Retired products to public users
    if (product.status !== 'Active' && (!req.user || (req.user.user_role !== 'admin' && req.user.user_role !== 'superadmin'))) {
      return res.status(403).json({ success: false, message: 'Product is currently unavailable' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/v1/products
// @access  Private (Admin)
exports.createProduct = async (req, res, next) => {
  try {
    const { title, description, category, scope, price, status, slug, metaTitle, metaDescription } = req.body;

    // 1. Extract Cloudinary Image URLs from Multer
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => file.path);
    }

    // 2. Build the Product Object
    const productData = {
      title,
      description,
      category,
      scope,
      price: price ? Number(price) : 0,
      status: status || 'Draft',
      imageUrls,
      features: parseArray(req.body.features),
      techStack: parseArray(req.body.techStack),
      tags: parseArray(req.body.tags),
      seo: {
        slug: slug ? generateSlug(slug) : generateSlug(title),
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || '',
        keywords: parseArray(req.body.keywords)
      }
    };

    const product = await Product.create(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Product slug already exists. Please choose a different title or slug.' });
    }
    next(error);
  }
};

// @desc    Update a product (Appends new images)
// @route   PUT /api/v1/products/:id
// @access  Private (Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updateData = { ...req.body };

    // 1. Append New Images from Cloudinary
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      updateData.imageUrls = [...product.imageUrls, ...newImages];
    }

    // 2. Parse Arrays if they were sent in the request
    if (req.body.features) updateData.features = parseArray(req.body.features);
    if (req.body.techStack) updateData.techStack = parseArray(req.body.techStack);
    if (req.body.tags) updateData.tags = parseArray(req.body.tags);
    
    // 3. Handle SEO nested object updates safely
    if (req.body.slug || req.body.metaTitle || req.body.metaDescription || req.body.keywords) {
      updateData.seo = {
        ...product.seo,
        slug: req.body.slug ? generateSlug(req.body.slug) : product.seo.slug,
        metaTitle: req.body.metaTitle || product.seo.metaTitle,
        metaDescription: req.body.metaDescription || product.seo.metaDescription,
        keywords: req.body.keywords ? parseArray(req.body.keywords) : product.seo.keywords,
      };
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Product slug already exists.' });
    }
    next(error);
  }
};

// @desc    Change Product Status (Active, Draft, Retired)
// @route   PATCH /api/v1/products/:id/status
// @access  Private (Admin)
exports.changeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Draft', 'Retired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    
    // NOTE: In a complete production environment, you might also want to loop through
    // product.imageUrls and call Cloudinary's destroy API here to delete the actual image files.

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};