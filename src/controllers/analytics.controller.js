const User = require('../models/User');
const Blog = require('../models/Blog');
const Product = require('../models/product');
const ContactMessage = require('../models/ContactMessage');

// --- HELPER: Calculate Stats for a Collection ---
const getCollectionStats = async (Model, dateField = 'createdAt') => {
  const now = new Date();

  // 1. Current Month Date Range
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 2. Previous Month Date Range
  // JS natively handles month wrap-around (e.g., January - 1 = December of previous year)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 3. Run queries in parallel for maximum performance
  const [total, currentMonthCount, previousMonthCount] = await Promise.all([
    Model.countDocuments(),
    Model.countDocuments({ [dateField]: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } }),
    Model.countDocuments({ [dateField]: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth } })
  ]);

  // 4. Calculate Growth Percentage
  let growthPercent = 0;
  if (previousMonthCount === 0) {
    // If no records last month, and we have records this month = 100% growth.
    growthPercent = currentMonthCount > 0 ? 100 : 0;
  } else {
    growthPercent = ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100;
  }

  // Round to 2 decimal places
  growthPercent = parseFloat(growthPercent.toFixed(2));
  const isPositive = growthPercent >= 0;

  return {
    value: total.toString(),
    growthPercent: growthPercent,
    growthText: `${isPositive ? '+' : ''}${growthPercent}% from last month`,
  };
};

// @desc    Get dashboard analytics counts and growth
// @route   GET /api/v1/analytics/dashboard
// @access  Private (Admin/Superadmin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Fetch all stats in parallel! 
    // Note: Our User model uses 'created_at', while others use 'createdAt'
    const [usersStats, postsStats, contactsStats, productsStats] = await Promise.all([
      getCollectionStats(User, 'created_at'),
      getCollectionStats(Blog, 'createdAt'),
      getCollectionStats(ContactMessage, 'createdAt'),
      getCollectionStats(Product, 'createdAt'),
    ]);

    // Format the response to easily map to your Flutter DashboardItem model
    res.status(200).json({
      success: true,
      data: {
        users: {
          title: 'Total Users',
          ...usersStats
        },
        posts: {
          title: 'Published Posts',
          ...postsStats
        },
        contacts: {
          title: 'New Messages',
          ...contactsStats
        },
        products: {
          title: 'Total Products',
          ...productsStats
        }
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    next(error);
  }
};