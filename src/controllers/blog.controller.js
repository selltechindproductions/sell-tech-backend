const Blog = require('../models/Blog');

// Helper to create a slug if not provided
const generateSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// @desc    Create a new blog
// @route   POST /api/v1/blogs
// @access  Private (Admin/Content Creator)
exports.createBlog = async (req, res, next) => {
  try {
    const { title, content, category, status, slug, metaTitle, metaDescription, keywords } = req.body;
    
    // Handle Images from Cloudinary Multer
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => file.path); // Cloudinary URL is stored in 'path'
    }

    const blogData = {
      title,
      content,
      category,
      status: status || 'Draft',
      authorId: req.user.id,
      imageUrls,
      slug: slug ? generateSlug(slug) : generateSlug(title),
      metaTitle: metaTitle || title,
      metaDescription,
      keywords: keywords ? (Array.isArray(keywords) ? keywords : keywords.split(',')) : []
    };

    const blog = await Blog.create(blogData);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Slug already exists. Please choose a different title or slug.' });
    next(error);
  }
};

// @desc    Get all blogs (with filtering and pagination)
// @route   GET /api/v1/blogs
// @access  Public (Only Published) / Private (Admin sees all)
exports.getBlogs = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    let query = {};

    // If regular user, only show Published. If Admin, allow filtering by status.
    if (!req.user || req.user.user_role === 'user') {
      query.status = 'Published';
    } else if (status) {
      query.status = status;
    }

    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate('authorId', 'name profile_pic')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog by Slug (Handles Views & Unique Visitors)
// @route   GET /api/v1/blogs/:slug
// @access  Public
exports.getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('authorId', 'name profile_pic profession')
      .populate('comments.user', 'name profile_pic');

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    // --- TRACKING LOGIC ---
    // 1. Always increment total views
    blog.views += 1;

    // 2. Track Unique Visitors (if user is logged in)
    // Assuming you have an optional auth middleware that sets req.user if a token exists
    if (req.user && req.user.id) {
      if (!blog.visitors.includes(req.user.id)) {
        blog.visitors.push(req.user.id);
      }
    }

    await blog.save();

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Update blog details (and add new images)
// @route   PUT /api/v1/blogs/:id
// @access  Private (Admin/Author)
exports.updateBlog = async (req, res, next) => {
  try {
    let blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    // Handle new images being added to the existing array
    let updatedImageUrls = [...blog.imageUrls];
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      updatedImageUrls = [...updatedImageUrls, ...newImages];
    }

    // Ensure keywords are an array
    if (req.body.keywords && typeof req.body.keywords === 'string') {
      req.body.keywords = req.body.keywords.split(',');
    }

    blog = await Blog.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, imageUrls: updatedImageUrls }, 
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Blog Status (Draft, Published, Archived)
// @route   PATCH /api/v1/blogs/:id/status
// @access  Private (Admin)
exports.changeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Draft', 'Published', 'Archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a blog
// @route   DELETE /api/v1/blogs/:id
// @access  Private (Admin)
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// INTERACTIONS: LIKES, BOOKMARKS, COMMENTS
// ==========================================

// @desc    Like or Unlike a blog
// @route   POST /api/v1/blogs/:id/like
// @access  Private
exports.toggleLike = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const isLiked = blog.likes.includes(req.user.id);
    if (isLiked) {
      blog.likes.pull(req.user.id); // Unlike
    } else {
      blog.likes.push(req.user.id); // Like
    }
    
    await blog.save();
    res.status(200).json({ success: true, isLiked: !isLiked, likeCount: blog.likes.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Bookmark or Unbookmark a blog
// @route   POST /api/v1/blogs/:id/bookmark
// @access  Private
exports.toggleBookmark = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const isBookmarked = blog.bookmarks.includes(req.user.id);
    if (isBookmarked) {
      blog.bookmarks.pull(req.user.id);
    } else {
      blog.bookmarks.push(req.user.id);
    }
    
    await blog.save();
    res.status(200).json({ success: true, isBookmarked: !isBookmarked });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a comment
// @route   POST /api/v1/blogs/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const newComment = {
      user: req.user.id,
      text: text
    };

    blog.comments.push(newComment);
    await blog.save();

    res.status(201).json({ success: true, data: blog.comments });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/v1/blogs/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    // Make sure the user deleting the comment is the one who wrote it (or an Admin)
    if (comment.user.toString() !== req.user.id && req.user.user_role !== 'admin' && req.user.user_role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await blog.save();

    res.status(200).json({ success: true, data: blog.comments });
  } catch (error) {
    next(error);
  }
};