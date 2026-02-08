const nodemailer = require('nodemailer');

// Email templates with anti-spam patterns
const defaultTemplates = {
  guestPost: {
    subject: 'Collaboration Opportunity with {{site_name}}',
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hello,</p>
  
  <p>I came across <strong>{{site_name}}</strong> ({{domain}}) while researching quality sites in the {{niche}} space, and I was impressed by the content you've published.</p>
  
  <p>My name is {{sender_name}}, and I work with businesses to create valuable, well-researched content. I'd love to explore potential collaboration opportunities with your site.</p>
  
  <p>Specifically, I'm interested in:</p>
  <ul>
    <li>Contributing a guest article on a topic relevant to your audience</li>
    <li>Discussing link insertion opportunities in existing content</li>
  </ul>
  
  <p>I ensure all content is original, thoroughly researched, and adds genuine value to your readers.</p>
  
  <p>Would you be open to a brief conversation about this?</p>
  
  <p>Best regards,<br>
  {{sender_name}}</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #888;">
    This email was sent regarding potential content collaboration. If you're not interested, simply ignore this message - you won't receive any follow-ups on this matter.
    <br><br>
    To stop receiving emails like this, reply with "unsubscribe" in the subject line.
  </p>
</body>
</html>
    `,
    textBody: `
Hello,

I came across {{site_name}} ({{domain}}) while researching quality sites in the {{niche}} space, and I was impressed by the content you've published.

My name is {{sender_name}}, and I work with businesses to create valuable, well-researched content. I'd love to explore potential collaboration opportunities with your site.

Specifically, I'm interested in:
- Contributing a guest article on a topic relevant to your audience
- Discussing link insertion opportunities in existing content

I ensure all content is original, thoroughly researched, and adds genuine value to your readers.

Would you be open to a brief conversation about this?

Best regards,
{{sender_name}}

---
This email was sent regarding potential content collaboration. If you're not interested, simply ignore this message - you won't receive any follow-ups on this matter.

To stop receiving emails like this, reply with "unsubscribe" in the subject line.
    `
  }
};

// Create transporter for a user
function createTransporter(gmailUser, gmailAppPassword) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    },
    // Gmail best practices
    pool: true,
    maxConnections: 1,
    maxMessages: 10,
    rateDelta: 1000,
    rateLimit: 1
  });
}

// Replace template variables
function personalizeEmail(template, data) {
  let result = template;
  
  const variables = {
    site_name: data.siteName || data.domain || 'your site',
    domain: data.domain || '',
    niche: data.niche || 'your industry',
    sender_name: data.senderName || 'An SEO Specialist',
    ...data
  };

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    result = result.replace(regex, value);
  });

  return result;
}

// Send single email
async function sendEmail(transporter, options) {
  const { to, subject, html, text, from, replyTo } = options;

  const mailOptions = {
    from: from,
    to: to,
    replyTo: replyTo || from,
    subject: subject,
    text: text,
    html: html,
    headers: {
      'X-Priority': '3', // Normal priority
      'X-Mailer': 'Custom Outreach System',
      'Precedence': 'bulk'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Validate email deliverability hints
function checkDeliverabilityRisks(subject, body) {
  const spamTriggers = [
    'free', 'guaranteed', 'act now', 'limited time', 'urgent',
    'click here', 'buy now', 'order now', 'special offer',
    'winner', 'congratulations', 'cash', 'million', 'billion',
    '!!!', '$$$', 'ALL CAPS'
  ];

  const warnings = [];
  const combinedText = (subject + ' ' + body).toLowerCase();

  spamTriggers.forEach(trigger => {
    if (combinedText.includes(trigger.toLowerCase())) {
      warnings.push(`Contains potential spam trigger: "${trigger}"`);
    }
  });

  // Check for excessive caps
  const capsRatio = (body.match(/[A-Z]/g) || []).length / body.length;
  if (capsRatio > 0.3) {
    warnings.push('High ratio of capital letters');
  }

  // Check for excessive punctuation
  if ((body.match(/[!?]/g) || []).length > 5) {
    warnings.push('Excessive use of exclamation/question marks');
  }

  return warnings;
}

module.exports = {
  defaultTemplates,
  createTransporter,
  personalizeEmail,
  sendEmail,
  checkDeliverabilityRisks
};
