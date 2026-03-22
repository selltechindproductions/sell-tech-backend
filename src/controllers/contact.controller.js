const ContactMessage = require('../models/ContactMessage');
const sendEmail = require('../utils/sendEmail');

// @desc    Create a new contact message
// @route   POST /api/v1/contacts
// @access  Public (Used by users on your website/app)
exports.createMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;

    const contactMessage = await ContactMessage.create({
      name, email, phone, message
    });

    res.status(201).json({ success: true, data: contactMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact messages (with filtering)
// @route   GET /api/v1/contacts
// @access  Private (Admin)
exports.getMessages = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    // Filter by Read/Unread
    if (status === 'Unread') query.isRead = false;
    if (status === 'Read') query.isRead = true;

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const messages = await ContactMessage.find(query).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a message as read
// @route   PATCH /api/v1/contacts/:id/read
// @access  Private (Admin)
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true, runValidators: true }
    );

    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message
// @route   DELETE /api/v1/contacts/:id
// @access  Private (Admin)
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Email (Reply or Bulk Compose)
// @route   POST /api/v1/contacts/send-email
// @access  Private (Admin)
exports.sendEmailToContacts = async (req, res, next) => {
  try {
    const { emails, subject, message } = req.body;

    if (!emails || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one recipient email' });
    }
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Please provide subject and message body' });
    }

    // sendEmail handles arrays perfectly (Nodemailer converts it to a comma-separated string)
    await sendEmail({
      email: emails, 
      subject: subject,
      message: message
    });

    res.status(200).json({ 
      success: true, 
      message: `Email sent successfully to ${emails.length} recipient(s)` 
    });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ success: false, message: 'Email could not be sent. Please check SMTP configuration.' });
  }
};