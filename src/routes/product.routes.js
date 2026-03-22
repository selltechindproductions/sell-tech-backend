const express = require('express');
const { 
  getProducts, 
  getProductBySlug,
  createProduct, 
  updateProduct, 
  deleteProduct,
  changeStatus
} = require('../controllers/product.controller');

// Import Middlewares
const { protect, authorizeRoles, optionalAuth } = require('../middlewares/auth.middleware');
const { uploadMultiple } = require('../middlewares/cloudinaryUpload.middleware'); // Your Cloudinary config

const router = express.Router();

// ----------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------
// optionalAuth attaches req.user if a token exists, allowing us to see if an Admin is viewing public lists
router.get('/', optionalAuth, getProducts);
router.get('/:slug', optionalAuth, getProductBySlug);

// ----------------------------------------------------
// PROTECTED ADMIN ROUTES
// ----------------------------------------------------
router.use(protect);
router.use(authorizeRoles('admin', 'superadmin'));

// Create & Update handle 'multipart/form-data' utilizing the Cloudinary middleware
// We expect the image files to be attached to the field name 'images'
router.post('/', uploadMultiple('products', 'images', 5), createProduct);
router.put('/:id', uploadMultiple('products', 'images', 5), updateProduct);

// Status toggling & Deletion
router.patch('/:id/status', changeStatus);
router.delete('/:id', deleteProduct);

module.exports = router;