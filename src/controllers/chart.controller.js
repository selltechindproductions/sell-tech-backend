const AnalyticsLog = require('../models/AnalyticsLog');
const moment = require('moment'); // Run: npm install moment

// @desc    Get chart data for the performance dashboard
// @route   GET /api/v1/analytics/charts?filter=monthly
// @access  Private (Admin)
exports.getChartPerformance = async (req, res, next) => {
  try {
    const { filter = 'monthly' } = req.query; // 'daily', 'weekly', 'monthly'

    // ==========================================
    // 1. BAR CHART: Section Performance
    // ==========================================
    // Get total views per section
    const sectionAgg = await AnalyticsLog.aggregate([
      { $group: { _id: '$section', count: { $sum: 1 } } }
    ]);

    // Map the DB results exactly to the Flutter BarChart labels order
    const barLabels = ["Post", "Page", "Product", "About", "Contact"];
    const barValues = barLabels.map(label => {
      const found = sectionAgg.find(item => item._id === label);
      return found ? found.count : 0;
    });


    // ==========================================
    // 2. LINE CHART: Blog Views vs Visitors
    // ==========================================
    let startDate;
    let groupByFormat;
    let generateLabels;
    let dataPoints = 0;

    // Define time ranges and MongoDB date grouping syntax
    if (filter === 'daily') {
      dataPoints = 14; // Last 14 days
      startDate = moment().subtract(dataPoints - 1, 'days').startOf('day').toDate();
      groupByFormat = { year: { $year: "$timestamp" }, month: { $month: "$timestamp" }, day: { $dayOfMonth: "$timestamp" } };
      generateLabels = (i) => moment().subtract(i, 'days').format('DD MMM');
    
    } else if (filter === 'weekly') {
      dataPoints = 12; // Last 12 weeks
      startDate = moment().subtract(dataPoints - 1, 'weeks').startOf('isoWeek').toDate();
      groupByFormat = { year: { $isoWeekYear: "$timestamp" }, week: { $isoWeek: "$timestamp" } };
      generateLabels = (i) => `W${moment().subtract(i, 'weeks').isoWeek()}`;
    
    } else {
      // Default: Monthly
      dataPoints = 12; // Last 12 months
      startDate = moment().subtract(dataPoints - 1, 'months').startOf('month').toDate();
      groupByFormat = { year: { $year: "$timestamp" }, month: { $month: "$timestamp" } };
      generateLabels = (i) => moment().subtract(i, 'months').format('MMM');
    }

    // Run the Aggregation for the Line Chart
    // We filter by 'Post' to track blog performance specifically
    const lineAgg = await AnalyticsLog.aggregate([
      { 
        $match: { 
          section: 'Post', 
          timestamp: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: groupByFormat,
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorId" } // Collect unique IDs
        }
      },
      {
        $project: {
          _id: 1,
          views: 1,
          visitors: { $size: "$uniqueVisitors" } // Count unique IDs
        }
      }
    ]);

    // ------------------------------------------
    // FLUTTER DATA FORMATTING
    // ------------------------------------------
    // MongoDB only returns buckets that have data. We must generate a continuous 
    // array of zeroes for the X-axis so the Flutter LineChart doesn't break.
    
    const lineLabels = [];
    const viewsData = [];
    const visitorsData = [];

    // Loop backwards to build the X-axis chronologically (Left to Right)
    for (let i = dataPoints - 1; i >= 0; i--) {
      // Current Date reference for this step in the loop
      const refDate = moment().subtract(i, filter === 'daily' ? 'days' : filter === 'weekly' ? 'weeks' : 'months');
      
      lineLabels.push(generateLabels(i));

      // Find if MongoDB returned data for this specific time bucket
      const foundBucket = lineAgg.find(item => {
        if (filter === 'daily') return item._id.day === refDate.date() && item._id.month === (refDate.month() + 1);
        if (filter === 'weekly') return item._id.week === refDate.isoWeek();
        return item._id.month === (refDate.month() + 1) && item._id.year === refDate.year();
      });

      // The X index matches the FlSpot X coordinate (0, 1, 2...)
      const xIndex = (dataPoints - 1) - i; 
      
      viewsData.push({ x: xIndex, y: foundBucket ? foundBucket.views : 0 });
      visitorsData.push({ x: xIndex, y: foundBucket ? foundBucket.visitors : 0 });
    }

    // ==========================================
    // 3. FINAL JSON RESPONSE
    // ==========================================
    res.status(200).json({
      success: true,
      data: {
        barChart: {
          labels: barLabels,
          values: barValues, // Array of Y values mapping to the labels
        },
        lineChart: {
          filter: filter,
          labels: lineLabels, // X-Axis bottom titles
          views: viewsData,   // For blue LineChartBarData (FlSpots)
          visitors: visitorsData // For green LineChartBarData (FlSpots)
        }
      }
    });
  } catch (error) {
    console.error('Chart Analytics Error:', error);
    next(error);
  }
};