const express = require('express');
const { 
  createMessage, 
  getMessages, 
  markAsRead, 
  deleteMessage, 
  sendEmailToContacts 
} = require('../controllers/contact.controller');

const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// ----------------------------------------------------
// PUBLIC ROUTES
// ----------------------------------------------------
// Allow anyone on your site to submit a contact form
router.post('/', createMessage);


// ----------------------------------------------------
// PROTECTED ADMIN ROUTES
// ----------------------------------------------------
// Apply protection and role checks to all routes below
router.use(protect);
router.use(authorizeRoles('admin', 'superadmin'));

router.get('/', getMessages);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

// The unified endpoint for both single replies and bulk emails
router.post('/send-email', sendEmailToContacts);

module.exports = router;