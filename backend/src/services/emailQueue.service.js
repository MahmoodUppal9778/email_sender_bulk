const cron = require('node-cron');
const Prospect = require('../models/Prospect.model');
const Campaign = require('../models/Campaign.model');
const User = require('../models/User.model');
const EmailLog = require('../models/EmailLog.model');
const QueueState = require('../models/QueueState.model');
const { createTransporter, personalizeEmail, sendEmail } = require('./email.service');

let isProcessing = false;

// Random delay between min and max seconds
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Calculate exponential backoff delay
function getBackoffDelay(attempts) {
  const baseDelay = 60 * 1000; // 1 minute
  const maxDelay = 60 * 60 * 1000; // 1 hour
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  return delay + Math.random() * 10000; // Add jitter
}

// Process email queue
async function processQueue() {
  if (isProcessing) {
    console.log('Queue already processing, skipping...');
    return;
  }

  isProcessing = true;

  try {
    const queueState = await QueueState.getState();

    // Check if paused or offline
    if (queueState.isPaused) {
      console.log('Queue is paused');
      return;
    }

    if (!queueState.isOnline) {
      console.log('System is offline, waiting for connection...');
      return;
    }

    // Reset hourly and daily counts if needed
    await QueueState.resetHourlyCount();
    await QueueState.resetDailyCount();

    // Get active campaigns
    const activeCampaigns = await Campaign.find({ status: 'active' })
      .populate('user');

    for (const campaign of activeCampaigns) {
      const user = campaign.user;
      if (!user || !user.gmailUser || !user.gmailAppPassword) {
        console.log(`Campaign ${campaign._id}: No Gmail credentials configured`);
        continue;
      }

      // Check user limits
      user.resetDailyStats();
      
      const emailsPerHour = campaign.settings?.emailsPerHour || user.settings.emailsPerHour;
      const emailsPerDay = campaign.settings?.emailsPerDay || user.settings.emailsPerDay;

      // Get current counts for this hour and today
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [sentThisHour, sentToday] = await Promise.all([
        EmailLog.countDocuments({
          user: user._id,
          status: 'sent',
          sentAt: { $gte: hourAgo }
        }),
        EmailLog.countDocuments({
          user: user._id,
          status: 'sent',
          sentAt: { $gte: todayStart }
        })
      ]);

      if (sentThisHour >= emailsPerHour) {
        console.log(`Campaign ${campaign._id}: Hourly limit reached (${sentThisHour}/${emailsPerHour})`);
        continue;
      }

      if (sentToday >= emailsPerDay) {
        console.log(`Campaign ${campaign._id}: Daily limit reached (${sentToday}/${emailsPerDay})`);
        continue;
      }

      // Apply warmup mode limits
      let effectiveHourlyLimit = emailsPerHour;
      if (user.settings.warmupMode && user.settings.warmupDaysRemaining > 0) {
        const warmupMultiplier = 1 - (user.settings.warmupDaysRemaining / 14) * 0.7;
        effectiveHourlyLimit = Math.ceil(emailsPerHour * warmupMultiplier);
        console.log(`Warmup mode: effective limit ${effectiveHourlyLimit}/hour`);
      }

      const remainingHourly = Math.max(0, effectiveHourlyLimit - sentThisHour);
      const remainingDaily = Math.max(0, emailsPerDay - sentToday);
      const canSend = Math.min(remainingHourly, remainingDaily, 5); // Max 5 per batch

      if (canSend <= 0) continue;

      // Get queued prospects for this campaign
      const prospects = await Prospect.find({
        campaign: campaign._id,
        emailStatus: { $in: ['queued', 'retrying'] },
        email: { $exists: true, $ne: null },
        $or: [
          { nextRetryAt: null },
          { nextRetryAt: { $lte: new Date() } }
        ]
      }).limit(canSend);

      if (prospects.length === 0) {
        // Check if campaign is complete
        const pendingCount = await Prospect.countDocuments({
          campaign: campaign._id,
          emailStatus: { $in: ['pending', 'queued', 'retrying'] }
        });

        if (pendingCount === 0) {
          campaign.status = 'completed';
          campaign.completedAt = new Date();
          await campaign.save();
          console.log(`Campaign ${campaign._id} completed`);
        }
        continue;
      }

      // Create transporter
      const transporter = createTransporter(user.gmailUser, user.gmailAppPassword);

      // Process each prospect
      for (const prospect of prospects) {
        try {
          // Personalize email
          const personalizedSubject = personalizeEmail(
            campaign.emailTemplate.subject,
            {
              siteName: prospect.websiteData?.siteName || prospect.domain,
              domain: prospect.domain,
              niche: prospect.websiteData?.niche || 'your industry',
              senderName: campaign.senderName
            }
          );

          const personalizedHtml = personalizeEmail(
            campaign.emailTemplate.htmlBody,
            {
              siteName: prospect.websiteData?.siteName || prospect.domain,
              domain: prospect.domain,
              niche: prospect.websiteData?.niche || 'your industry',
              senderName: campaign.senderName
            }
          );

          const personalizedText = personalizeEmail(
            campaign.emailTemplate.textBody,
            {
              siteName: prospect.websiteData?.siteName || prospect.domain,
              domain: prospect.domain,
              niche: prospect.websiteData?.niche || 'your industry',
              senderName: campaign.senderName
            }
          );

          // Send email
          const result = await sendEmail(transporter, {
            to: prospect.email,
            from: `${campaign.senderName} <${user.gmailUser}>`,
            subject: personalizedSubject,
            html: personalizedHtml,
            text: personalizedText
          });

          // Log result
          await EmailLog.create({
            user: user._id,
            campaign: campaign._id,
            prospect: prospect._id,
            to: prospect.email,
            subject: personalizedSubject,
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId,
            error: result.error,
            errorCode: result.code,
            attemptNumber: prospect.emailAttempts + 1
          });

          // Update prospect
          prospect.emailAttempts += 1;
          prospect.lastEmailAttempt = new Date();

          if (result.success) {
            prospect.emailStatus = 'sent';
            prospect.emailSentAt = new Date();
            prospect.personalizedEmail = {
              subject: personalizedSubject,
              htmlBody: personalizedHtml,
              textBody: personalizedText
            };

            // Update stats
            campaign.stats.emailsSent += 1;
            campaign.stats.emailsPending = Math.max(0, campaign.stats.emailsPending - 1);
            user.stats.totalEmailsSent += 1;
            user.stats.emailsSentToday += 1;
            user.stats.lastEmailSentAt = new Date();

            console.log(`✅ Email sent to ${prospect.email} for campaign ${campaign.name}`);
          } else {
            // Handle failure with retry logic
            if (prospect.emailAttempts < 3) {
              prospect.emailStatus = 'retrying';
              prospect.nextRetryAt = new Date(Date.now() + getBackoffDelay(prospect.emailAttempts));
              campaign.stats.emailsRetrying += 1;
            } else {
              prospect.emailStatus = 'failed';
              prospect.emailError = result.error;
              campaign.stats.emailsFailed += 1;
            }
            campaign.stats.emailsPending = Math.max(0, campaign.stats.emailsPending - 1);

            console.log(`❌ Email failed to ${prospect.email}: ${result.error}`);
          }

          await prospect.save();

          // Update queue state
          queueState.lastProcessedAt = new Date();
          await queueState.save();

          // Random delay between emails
          const minDelay = campaign.settings?.minDelaySeconds || user.settings.minDelaySeconds;
          const maxDelay = campaign.settings?.maxDelaySeconds || user.settings.maxDelaySeconds;
          const delay = getRandomDelay(minDelay, maxDelay);
          console.log(`Waiting ${delay / 1000}s before next email...`);
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
          console.error(`Error processing prospect ${prospect._id}:`, error);
          queueState.errorCount += 1;
          queueState.lastError = error.message;
          queueState.lastErrorAt = new Date();
          await queueState.save();
        }
      }

      await campaign.save();
      await user.save();

      // Close transporter
      transporter.close();
    }
  } catch (error) {
    console.error('Queue processing error:', error);
    const queueState = await QueueState.getState();
    queueState.errorCount += 1;
    queueState.lastError = error.message;
    queueState.lastErrorAt = new Date();
    await queueState.save();
  } finally {
    isProcessing = false;
  }
}

// Decrease warmup days (run daily at midnight)
async function decreaseWarmupDays() {
  await User.updateMany(
    { 'settings.warmupMode': true, 'settings.warmupDaysRemaining': { $gt: 0 } },
    { $inc: { 'settings.warmupDaysRemaining': -1 } }
  );
  console.log('Warmup days decreased');
}

// Start the queue processor
function startEmailQueue() {
  console.log('📧 Email queue processor started');

  // Process queue every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    console.log('Running queue processor...');
    processQueue();
  });

  // Decrease warmup days at midnight
  cron.schedule('0 0 * * *', () => {
    decreaseWarmupDays();
  });

  // Initial run
  setTimeout(processQueue, 5000);
}

module.exports = {
  startEmailQueue,
  processQueue
};
