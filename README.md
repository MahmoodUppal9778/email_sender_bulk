# SEO Email Outreach System

A production-ready automated email outreach web application for SEO guest posting using Gmail.

## Features

- **Gmail App Password Authentication** - Secure email sending via Nodemailer
- **File Upload** - CSV and Excel file support for prospect lists
- **Email Scraping** - Automatically find contact emails from websites
- **Website Analysis** - Extract site name, niche, and keywords for personalization
- **Queue-Based Sending** - Configurable rate limits with random delays
- **Connectivity Resilience** - Auto-pause on offline, resume when connected
- **Warmup Mode** - Gradual sending increase to protect reputation
- **Dashboard** - Real-time monitoring, stats, and error tracking

## Project Structure

```
local-app/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth middleware
│   │   └── server.js        # Entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/                # Vue.js 3 + Vite
    ├── src/
    │   ├── components/      # Reusable components
    │   ├── views/           # Page components
    │   ├── stores/          # Pinia state management
    │   ├── router/          # Vue Router config
    │   └── services/        # API client
    ├── package.json
    └── vite.config.js
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Gmail account with 2FA enabled

### Backend Setup

```bash
cd local-app/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start the server
npm run dev
```

### Frontend Setup

```bash
cd local-app/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000

## Gmail App Password Setup

1. Go to your Google Account → Security
2. Enable **2-Step Verification** if not already enabled
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and your device
5. Click "Generate" 
6. Copy the 16-character password
7. Add to your `.env` file or configure in Settings page

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/seo-outreach

# JWT
JWT_SECRET=your-secret-key

# Gmail (can also be set per-user in UI)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Limits
EMAILS_PER_HOUR=20
EMAILS_PER_DAY=100

# Frontend CORS
FRONTEND_URL=http://localhost:8080
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/gmail-settings` - Update Gmail credentials
- `PUT /api/auth/settings` - Update sending limits

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/start` - Start sending
- `POST /api/campaigns/:id/pause` - Pause campaign
- `POST /api/campaigns/:id/resume` - Resume campaign

### Upload
- `POST /api/upload/:campaignId` - Upload CSV/Excel file
- `POST /api/upload/:campaignId/scrape-emails` - Find missing emails
- `POST /api/upload/:campaignId/analyze-websites` - Extract website data

### Emails
- `GET /api/emails/logs` - Get email logs
- `GET /api/emails/stats` - Get sending stats
- `GET /api/emails/queue-state` - Get queue status
- `POST /api/emails/queue/pause` - Pause queue
- `POST /api/emails/queue/resume` - Resume queue
- `POST /api/emails/retry-failed` - Retry failed emails

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard stats
- `GET /api/dashboard/activity` - Get activity chart data
- `GET /api/dashboard/errors` - Get error logs

## Database Schema

### User
- email, password, name
- gmailUser, gmailAppPassword
- settings (limits, warmup mode)
- stats (totals, daily counts)

### Campaign
- name, description, status
- emailTemplate (subject, HTML, text)
- senderName
- stats (sent, pending, failed)

### Prospect
- websiteUrl, domain, email
- websiteData (siteName, niche, keywords)
- emailStatus, attempts, errors

### EmailLog
- to, subject, status
- messageId, error
- campaign, prospect references

### QueueState
- isOnline, isPaused
- hourly/daily counts
- error tracking

## Deliverability Best Practices

1. **Start with warmup mode** - Gradually increase volume over 14 days
2. **Use random delays** - 30-120 seconds between emails
3. **Stay under limits** - Max 100-200 emails/day per account
4. **Personalize content** - Use {{site_name}}, {{domain}}, {{niche}} variables
5. **Include unsubscribe** - Always have opt-out text
6. **Avoid spam words** - No "FREE", "ACT NOW", excessive caps
7. **Both formats** - Send HTML and plain text versions

## Retry Logic

Failed emails are automatically retried with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: ~2 minutes
- Attempt 3: ~4 minutes
- After 3 failures: Marked as failed

## Offline Handling

The system monitors connectivity every 30 seconds:
- **Connection lost** → Queue automatically pauses
- **Connection restored** → Queue automatically resumes
- **Server restart** → Queue state persisted in database

## Security Considerations

1. App passwords are stored in database (encrypt in production)
2. JWT tokens expire after 7 days
3. Rate limiting on API endpoints
4. CORS configured for frontend origin
5. Helmet.js for security headers

## Production Deployment

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas or dedicated MongoDB
3. Enable SSL/TLS
4. Encrypt sensitive data (passwords, tokens)
5. Set up proper logging
6. Configure reverse proxy (nginx)
7. Use PM2 or similar for process management

## License

MIT
