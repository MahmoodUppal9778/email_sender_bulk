const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  gmailUser: {
    type: String,
    trim: true
  },
  gmailAppPassword: {
    type: String // Encrypted in production
  },
  settings: {
    emailsPerHour: { type: Number, default: 20 },
    emailsPerDay: { type: Number, default: 100 },
    minDelaySeconds: { type: Number, default: 30 },
    maxDelaySeconds: { type: Number, default: 120 },
    warmupMode: { type: Boolean, default: true },
    warmupDaysRemaining: { type: Number, default: 14 }
  },
  stats: {
    totalEmailsSent: { type: Number, default: 0 },
    totalCampaigns: { type: Number, default: 0 },
    emailsSentToday: { type: Number, default: 0 },
    lastEmailSentAt: Date,
    lastStatResetDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Reset daily stats
userSchema.methods.resetDailyStats = function() {
  const today = new Date().toDateString();
  if (this.stats.lastStatResetDate?.toDateString() !== today) {
    this.stats.emailsSentToday = 0;
    this.stats.lastStatResetDate = new Date();
  }
};

module.exports = mongoose.model('User', userSchema);
