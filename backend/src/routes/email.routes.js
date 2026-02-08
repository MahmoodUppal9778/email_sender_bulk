const express = require('express');
const EmailLog = require('../models/EmailLog.model');
const Prospect = require('../models/Prospect.model');
const QueueState = require('../models/QueueState.model');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Get email logs for user
router.get('/logs', authMiddleware, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, campaignId } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (campaignId) query.campaign = campaignId;

    const logs = await EmailLog.find(query)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('campaign', 'name')
      .populate('prospect', 'domain websiteUrl');

    const total = await EmailLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
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

// Get queue state
router.get('/queue-state', authMiddleware, async (req, res, next) => {
  try {
    const state = await QueueState.getState();
    
    // Get pending emails count for user
    const pendingCount = await Prospect.countDocuments({
      user: req.user._id,
      emailStatus: 'queued'
    });

    res.json({
      success: true,
      data: {
        state,
        pendingEmails: pendingCount,
        userLimits: req.user.settings
      }
    });
  } catch (error) {
    next(error);
  }
});

// Pause queue
router.post('/queue/pause', authMiddleware, async (req, res, next) => {
  try {
    const state = await QueueState.getState();
    state.isPaused = true;
    state.pausedAt = new Date();
    await state.save();

    res.json({
      success: true,
      message: 'Email queue paused'
    });
  } catch (error) {
    next(error);
  }
});

// Resume queue
router.post('/queue/resume', authMiddleware, async (req, res, next) => {
  try {
    const state = await QueueState.getState();
    state.isPaused = false;
    state.resumedAt = new Date();
    await state.save();

    res.json({
      success: true,
      message: 'Email queue resumed'
    });
  } catch (error) {
    next(error);
  }
});

// Retry failed emails
router.post('/retry-failed', authMiddleware, async (req, res, next) => {
  try {
    const { campaignId } = req.body;

    const query = {
      user: req.user._id,
      emailStatus: 'failed'
    };
    if (campaignId) query.campaign = campaignId;

    const result = await Prospect.updateMany(query, {
      $set: {
        emailStatus: 'queued',
        emailError: null,
        nextRetryAt: null
      }
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} emails queued for retry`
    });
  } catch (error) {
    next(error);
  }
});

// Get email stats
router.get('/stats', authMiddleware, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sentToday, sentThisHour, totalSent, totalFailed, pending] = await Promise.all([
      EmailLog.countDocuments({
        user: req.user._id,
        status: 'sent',
        sentAt: { $gte: today }
      }),
      EmailLog.countDocuments({
        user: req.user._id,
        status: 'sent',
        sentAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      }),
      EmailLog.countDocuments({
        user: req.user._id,
        status: 'sent'
      }),
      EmailLog.countDocuments({
        user: req.user._id,
        status: 'failed'
      }),
      Prospect.countDocuments({
        user: req.user._id,
        emailStatus: { $in: ['pending', 'queued'] }
      })
    ]);

    res.json({
      success: true,
      data: {
        sentToday,
        sentThisHour,
        totalSent,
        totalFailed,
        pending,
        limits: {
          perHour: req.user.settings.emailsPerHour,
          perDay: req.user.settings.emailsPerDay
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
