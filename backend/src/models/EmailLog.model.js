const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  prospect: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    required: true
  },
  to: {
    type: String,
    required: true
  },
  subject: String,
  status: {
    type: String,
    enum: ['sent', 'failed', 'retrying'],
    required: true
  },
  messageId: String,
  error: String,
  errorCode: String,
  attemptNumber: {
    type: Number,
    default: 1
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

emailLogSchema.index({ user: 1, sentAt: -1 });
emailLogSchema.index({ campaign: 1, status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
