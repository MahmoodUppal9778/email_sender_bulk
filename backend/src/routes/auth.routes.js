const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name
    });

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          settings: user.settings,
          stats: user.stats
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

// Update Gmail credentials
router.put('/gmail-settings', authMiddleware, async (req, res, next) => {
  try {
    const { gmailUser, gmailAppPassword } = req.body;

    req.user.gmailUser = gmailUser;
    req.user.gmailAppPassword = gmailAppPassword; // Encrypt in production!
    await req.user.save();

    res.json({
      success: true,
      message: 'Gmail settings updated'
    });
  } catch (error) {
    next(error);
  }
});

// Update sending settings
router.put('/settings', authMiddleware, async (req, res, next) => {
  try {
    const { emailsPerHour, emailsPerDay, minDelaySeconds, maxDelaySeconds, warmupMode } = req.body;

    Object.assign(req.user.settings, {
      emailsPerHour: emailsPerHour ?? req.user.settings.emailsPerHour,
      emailsPerDay: emailsPerDay ?? req.user.settings.emailsPerDay,
      minDelaySeconds: minDelaySeconds ?? req.user.settings.minDelaySeconds,
      maxDelaySeconds: maxDelaySeconds ?? req.user.settings.maxDelaySeconds,
      warmupMode: warmupMode ?? req.user.settings.warmupMode
    });

    await req.user.save();

    res.json({
      success: true,
      message: 'Settings updated',
      data: { settings: req.user.settings }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
