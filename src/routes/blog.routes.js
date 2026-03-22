const express = require('express');
const { 
  createBlog, 
  getBlogs, 
  getBlogBySlug, 
  updateBlog, 
  deleteBlog, 
  changeStatus,
  toggleLike,
  toggleBookmark,
  addComment,
  deleteComment
} = require('../controllers/blog.controller');

// Middlewares
const { protect, authorizeRoles, optionalAuth } = require('../middlewares/auth.middleware');
const { uploadMultiple } = require('../middlewares/cloudinaryUpload.middleware'); // Your provided Cloudinary middleware

const router = express.Router();

// -----------------------------
// PUBLIC & READING ROUTES
// -----------------------------
// optionalAuth checks for a token to track unique visitors, but allows guests through.
router.get('/', optionalAuth, getBlogs);
router.get('/:slug', optionalAuth, getBlogBySlug);

// -----------------------------
// USER INTERACTION ROUTES
// -----------------------------
router.post('/:id/like', protect, toggleLike);
router.post('/:id/bookmark', protect, toggleBookmark);
router.post('/:id/comments', protect, addComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

// -----------------------------
// ADMIN & CONTENT CREATOR ROUTES
// -----------------------------
// Apply protection and role checks to all routes below
router.use(protect);
router.use(authorizeRoles('admin', 'superadmin', 'content_creator'));

// Create blog: Expects a form-data field named 'images' (max 5 files)
router.post('/', uploadMultiple('blogs', 'images', 5), createBlog);

// Update blog (Can also receive new images to append)
router.put('/:id', uploadMultiple('blogs', 'images', 5), updateBlog);

// Quick status change & Deletion
router.patch('/:id/status', changeStatus);
router.delete('/:id', deleteBlog);

module.exports = router;