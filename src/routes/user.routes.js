const express = require('express');
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} = require('../controllers/user.controller');

const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Apply extreme security to all routes in this file
router.use(protect);
router.use(authorizeRoles('admin', 'superadmin'));

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;