const express = require('express');
const Campaign = require('../models/Campaign.model');
const Prospect = require('../models/Prospect.model');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Get all campaigns
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { campaigns }
    });
  } catch (error) {
    next(error);
  }
});

// Get single campaign
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get prospect stats
    const prospects = await Prospect.find({ campaign: campaign._id });
    
    res.json({
      success: true,
      data: { campaign, prospects }
    });
  } catch (error) {
    next(error);
  }
});

// Create campaign
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, description, emailTemplate, senderName, settings } = req.body;

    const campaign = await Campaign.create({
      user: req.user._id,
      name,
      description,
      emailTemplate,
      senderName,
      settings: settings || req.user.settings
    });

    req.user.stats.totalCampaigns += 1;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
});

// Update campaign
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign updated',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
});

// Start campaign
router.post('/:id/start', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!req.user.gmailUser || !req.user.gmailAppPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please configure your Gmail settings first'
      });
    }

    // Queue all pending prospects
    await Prospect.updateMany(
      { campaign: campaign._id, emailStatus: 'pending' },
      { $set: { emailStatus: 'queued' } }
    );

    const queuedCount = await Prospect.countDocuments({
      campaign: campaign._id,
      emailStatus: 'queued'
    });

    campaign.status = 'active';
    campaign.startedAt = new Date();
    campaign.stats.emailsPending = queuedCount;
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign started. ${queuedCount} emails queued.`,
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
});

// Pause campaign
router.post('/:id/pause', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { status: 'paused' } },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign paused',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
});

// Resume campaign
router.post('/:id/resume', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { status: 'active' } },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      message: 'Campaign resumed',
      data: { campaign }
    });
  } catch (error) {
    next(error);
  }
});

// Delete campaign
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Delete associated prospects
    await Prospect.deleteMany({ campaign: campaign._id });

    res.json({
      success: true,
      message: 'Campaign deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
