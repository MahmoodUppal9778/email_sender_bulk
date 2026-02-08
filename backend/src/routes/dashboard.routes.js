const express = require('express');
const Campaign = require('../models/Campaign.model');
const Prospect = require('../models/Prospect.model');
const EmailLog = require('../models/EmailLog.model');
const QueueState = require('../models/QueueState.model');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Get dashboard overview
router.get('/overview', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCampaigns,
      activeCampaigns,
      totalProspects,
      emailStats,
      recentLogs,
      queueState
    ] = await Promise.all([
      Campaign.countDocuments({ user: userId }),
      Campaign.countDocuments({ user: userId, status: 'active' }),
      Prospect.countDocuments({ user: userId }),
      Prospect.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$emailStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      EmailLog.find({ user: userId })
        .sort({ sentAt: -1 })
        .limit(10)
        .populate('campaign', 'name'),
      QueueState.getState()
    ]);

    // Calculate daily stats
    const sentToday = await EmailLog.countDocuments({
      user: userId,
      status: 'sent',
      sentAt: { $gte: today }
    });

    const sentThisHour = await EmailLog.countDocuments({
      user: userId,
      status: 'sent',
      sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    // Format email stats
    const statusCounts = {};
    emailStats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns
        },
        prospects: {
          total: totalProspects,
          pending: statusCounts.pending || 0,
          queued: statusCounts.queued || 0,
          sent: statusCounts.sent || 0,
          failed: statusCounts.failed || 0,
          retrying: statusCounts.retrying || 0
        },
        emails: {
          sentToday,
          sentThisHour,
          dailyLimit: req.user.settings.emailsPerDay,
          hourlyLimit: req.user.settings.emailsPerHour,
          dailyRemaining: Math.max(0, req.user.settings.emailsPerDay - sentToday),
          hourlyRemaining: Math.max(0, req.user.settings.emailsPerHour - sentThisHour)
        },
        queue: {
          isOnline: queueState.isOnline,
          isPaused: queueState.isPaused,
          errorCount: queueState.errorCount,
          lastError: queueState.lastError,
          lastProcessedAt: queueState.lastProcessedAt
        },
        recentActivity: recentLogs.map(log => ({
          id: log._id,
          to: log.to,
          status: log.status,
          campaign: log.campaign?.name,
          sentAt: log.sentAt,
          error: log.error
        })),
        settings: req.user.settings
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get sending activity chart data
router.get('/activity', authMiddleware, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const activity = await EmailLog.aggregate([
      {
        $match: {
          user: req.user._id,
          sentAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format for chart
    const chartData = {};
    activity.forEach(item => {
      if (!chartData[item._id.date]) {
        chartData[item._id.date] = { date: item._id.date, sent: 0, failed: 0 };
      }
      chartData[item._id.date][item._id.status] = item.count;
    });

    res.json({
      success: true,
      data: Object.values(chartData)
    });
  } catch (error) {
    next(error);
  }
});

// Get error logs
router.get('/errors', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const errors = await EmailLog.find({
      user: req.user._id,
      status: { $in: ['failed', 'retrying'] }
    })
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('campaign', 'name')
      .populate('prospect', 'domain websiteUrl email');

    const total = await EmailLog.countDocuments({
      user: req.user._id,
      status: { $in: ['failed', 'retrying'] }
    });

    res.json({
      success: true,
      data: {
        errors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
