const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const validator = require('validator');
const Campaign = require('../models/Campaign.model');
const Prospect = require('../models/Prospect.model');
const authMiddleware = require('../middleware/auth.middleware');
const { scrapeWebsiteData, findEmailFromWebsite } = require('../services/scraper.service');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Extract domain from URL
function extractDomain(url) {
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '').toLowerCase();
  } catch {
    return null;
  }
}

// Normalize URL
function normalizeUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return null;
  }
}

// Parse uploaded file
function parseFile(buffer, filename) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) {
    throw new Error('File is empty');
  }

  // Find column indices
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const urlColIndex = headers.findIndex(h => 
    h.includes('url') || h.includes('website') || h.includes('site') || h.includes('domain')
  );
  const emailColIndex = headers.findIndex(h => 
    h.includes('email') || h.includes('mail') || h.includes('contact')
  );

  if (urlColIndex === -1) {
    throw new Error('Could not find URL/website column. Please ensure your file has a column with "url", "website", or "domain" in the header.');
  }

  const prospects = [];
  const seenDomains = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[urlColIndex]) continue;

    const websiteUrl = normalizeUrl(row[urlColIndex]);
    if (!websiteUrl) continue;

    const domain = extractDomain(websiteUrl);
    if (!domain || seenDomains.has(domain)) continue;

    let email = emailColIndex >= 0 ? row[emailColIndex] : null;
    if (email && !validator.isEmail(String(email).trim())) {
      email = null;
    }

    seenDomains.add(domain);
    prospects.push({
      websiteUrl,
      domain,
      email: email ? String(email).trim().toLowerCase() : null,
      emailSource: email ? 'uploaded' : null
    });
  }

  return prospects;
}

// Upload prospects to campaign
router.post('/:campaignId', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse file
    const prospects = parseFile(req.file.buffer, req.file.originalname);

    if (prospects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid prospects found in file'
      });
    }

    // Get existing domains in campaign
    const existingDomains = await Prospect.distinct('domain', { campaign: campaign._id });
    const existingSet = new Set(existingDomains);

    // Filter out duplicates
    const newProspects = prospects.filter(p => !existingSet.has(p.domain));

    // Insert new prospects
    let inserted = 0;
    let skipped = prospects.length - newProspects.length;

    if (newProspects.length > 0) {
      const docs = newProspects.map(p => ({
        ...p,
        campaign: campaign._id,
        user: req.user._id
      }));

      await Prospect.insertMany(docs, { ordered: false }).catch(err => {
        // Handle duplicate key errors gracefully
        if (err.code !== 11000) throw err;
      });

      inserted = newProspects.length;
    }

    // Update campaign stats
    campaign.stats.totalProspects = await Prospect.countDocuments({ campaign: campaign._id });
    campaign.stats.emailsPending = await Prospect.countDocuments({ 
      campaign: campaign._id, 
      emailStatus: { $in: ['pending', 'queued'] }
    });
    await campaign.save();

    res.json({
      success: true,
      message: `Uploaded ${inserted} prospects. ${skipped} duplicates skipped.`,
      data: {
        inserted,
        skipped,
        total: campaign.stats.totalProspects
      }
    });
  } catch (error) {
    next(error);
  }
});

// Scrape missing emails for campaign
router.post('/:campaignId/scrape-emails', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get prospects without emails
    const prospectsWithoutEmail = await Prospect.find({
      campaign: campaign._id,
      email: null
    }).limit(50); // Process in batches

    let found = 0;
    let failed = 0;

    for (const prospect of prospectsWithoutEmail) {
      try {
        const email = await findEmailFromWebsite(prospect.websiteUrl);
        if (email) {
          prospect.email = email;
          prospect.emailSource = 'scraped';
          found++;
        }
        
        // Also scrape website data for personalization
        const websiteData = await scrapeWebsiteData(prospect.websiteUrl);
        if (websiteData) {
          prospect.websiteData = websiteData;
        }
        
        await prospect.save();
      } catch (err) {
        failed++;
        console.error(`Failed to scrape ${prospect.websiteUrl}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Scraped ${prospectsWithoutEmail.length} websites. Found ${found} emails.`,
      data: { processed: prospectsWithoutEmail.length, found, failed }
    });
  } catch (error) {
    next(error);
  }
});

// Analyze websites for personalization
router.post('/:campaignId/analyze-websites', authMiddleware, async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      user: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get prospects without website data
    const prospects = await Prospect.find({
      campaign: campaign._id,
      'websiteData.scrapedAt': null
    }).limit(50);

    let analyzed = 0;

    for (const prospect of prospects) {
      try {
        const websiteData = await scrapeWebsiteData(prospect.websiteUrl);
        if (websiteData) {
          prospect.websiteData = websiteData;
          analyzed++;
        }
        await prospect.save();
      } catch (err) {
        console.error(`Failed to analyze ${prospect.websiteUrl}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Analyzed ${analyzed} websites`,
      data: { analyzed }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
