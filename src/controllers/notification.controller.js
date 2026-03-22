const admin = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User'); // Assuming you created this earlier

// Helper function to chunk arrays into smaller batches (Max 500 for FCM)
const chunkArray = (array, size) => {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
};

// @desc    Send a push notification to users
// @route   POST /api/v1/notifications/send
// @access  Private (Admin/Superadmin)
exports.sendNotification = async (req, res, next) => {
  try {
    const { title, body, imageUrl, target } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    // 1. Fetch valid FCM tokens from the database based on target
    let query = { fcm_token: { $ne: '', $exists: true } };
    
    // Optional: If you want to target specific platforms or roles
    // if (target === 'content_creators') query.user_role = 'content_creator';

    const users = await User.find(query).select('fcm_token _id');
    const tokens = users.map(user => user.fcm_token);

    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found with valid FCM tokens' });
    }

    // 2. Prepare the FCM Message Payload
    const messagePayload = {
      notification: {
        title: title,
        body: body,
        ...(imageUrl && { image: imageUrl }), // Conditionally add image if it exists
      },
      // Optional: Add hidden data payload for Flutter routing
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        targetType: target || 'general'
      }
    };

    // 3. Chunk tokens into batches of 500 (FCM Multicast Limit)
    const tokenBatches = chunkArray(tokens, 500);
    
    let totalSuccess = 0;
    let totalFailure = 0;
    let failedTokensToCleanup = [];

    // 4. Send batches to Firebase
    for (const batch of tokenBatches) {
      const response = await admin.messaging().sendEachForMulticast({
        ...messagePayload,
        tokens: batch,
      });

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // 5. Identify dead tokens (uninstalls, expired) for cleanup
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokensToCleanup.push(batch[idx]);
            }
          }
        });
      }
    }

    // 6. Clean up dead tokens from the database (Crucial for production)
    if (failedTokensToCleanup.length > 0) {
      await User.updateMany(
        { fcm_token: { $in: failedTokensToCleanup } },
        { $set: { fcm_token: '' } } // Clear the invalid token
      );
      console.log(`🧹 Cleaned up ${failedTokensToCleanup.length} dead FCM tokens.`);
    }

    // 7. Determine Final Status
    let finalStatus = 'Sent';
    if (totalSuccess === 0 && totalFailure > 0) finalStatus = 'Failed';
    else if (totalFailure > 0) finalStatus = 'Partial Success';

    // 8. Save Notification History to Database
    const notificationRecord = await Notification.create({
      title,
      body,
      imageUrl,
      target: target || 'all',
      status: finalStatus,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });

    res.status(200).json({
      success: true,
      data: notificationRecord,
      summary: {
        totalTargeted: tokens.length,
        success: totalSuccess,
        failed: totalFailure,
        cleanedUpTokens: failedTokensToCleanup.length
      }
    });

  } catch (error) {
    console.error('FCM Send Error:', error);
    next(error);
  }
};

// @desc    Get notification history
// @route   GET /api/v1/notifications
// @access  Private (Admin)
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ sentAt: -1 });
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};