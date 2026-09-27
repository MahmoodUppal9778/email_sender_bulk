const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  websiteUrl: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  emailSource: {
    type: String,
    enum: ['uploaded', 'scraped', 'manual'],
    default: 'uploaded'
  },
  websiteData: {
    siteName: String,
    niche: String,
    keywords: [String],
    description: String,
    contactPageUrl: String,
    scrapedAt: Date
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'failed', 'retrying', 'skipped'],
    default: 'pending'
  },
  emailAttempts: {
    type: Number,
    default: 0
  },
  lastEmailAttempt: Date,
  nextRetryAt: Date,
  emailSentAt: Date,
  emailError: String,
  personalizedEmail: {
    subject: String,
    htmlBody: String,
    textBody: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for deduplication.
// IMPORTANT: this replaces the old { campaign, domain } unique index.
// A domain can now have many Prospect documents — one per distinct email
// address found for it — and duplicates are prevented per (domain, email)
// pair instead of collapsing the whole domain into a single row. Two rows
// with the same domain and no email (email: null) still collide, so a
// domain with genuinely no address found is still only stored once.
prospectSchema.index({ campaign: 1, domain: 1, email: 1 }, { unique: true });
prospectSchema.index({ campaign: 1, emailStatus: 1 });
prospectSchema.index({ emailStatus: 1, nextRetryAt: 1 });

prospectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Prospect', prospectSchema);