const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'failed'],
    default: 'draft'
  },
  emailTemplate: {
    subject: {
      type: String,
      required: true
    },
    htmlBody: {
      type: String,
      required: true
    },
    textBody: {
      type: String,
      required: true
    }
  },
  senderName: {
    type: String,
    required: true
  },
  stats: {
    totalProspects: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 },
    emailsPending: { type: Number, default: 0 },
    emailsFailed: { type: Number, default: 0 },
    emailsRetrying: { type: Number, default: 0 }
  },
  settings: {
    emailsPerHour: Number,
    emailsPerDay: Number,
    minDelaySeconds: Number,
    maxDelaySeconds: Number
  },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

campaignSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
