const User = require('../models/User');

// @desc    Get all users (with search and filtering)
// @route   GET /api/v1/users
// @access  Private (Admin/Superadmin)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, is_verified, search } = req.query;
    let query = {};

    // Filtering
    if (role && role !== 'All') query.user_role = role;
    if (is_verified !== undefined) query.is_verified = is_verified === 'true';

    // Searching by name, username, or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -refresh_token') // Ensure secrets never leak
      .sort({ created_at: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private (Admin/Superadmin)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refresh_token');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role & verification status
// @route   PUT /api/v1/users/:id
// @access  Private (Admin/Superadmin)
exports.updateUser = async (req, res, next) => {
  try {
    const { user_role, is_verified } = req.body;

    // Prevent Admins from accidentally downgrading Superadmins
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.user_role === 'superadmin' && req.user.user_role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only a Superadmin can modify another Superadmin' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        ...(user_role && { user_role }),
        ...(is_verified !== undefined && { is_verified })
      },
      { new: true, runValidators: true }
    ).select('-password -refresh_token');

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin/Superadmin)
exports.deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Security check: Don't let admins delete superadmins, and don't let admins delete themselves
    if (targetUser.user_role === 'superadmin' && req.user.user_role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete a Superadmin account' });
    }
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active session account' });
    }

    await targetUser.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};