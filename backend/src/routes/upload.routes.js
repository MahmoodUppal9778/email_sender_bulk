const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pulls EVERY valid email out of a cell, not just a single one. Cells often
// contain multiple addresses separated by ";" or "," (e.g.
// "submissions@site.com; pauline@site.com") — the old code validated the
// whole cell as ONE email and silently dropped everything when it wasn't,
// which is why multi-email rows were showing up as "Not found".
function extractEmails(rawCell) {
  if (!rawCell) return [];

  const candidates = String(rawCell)
    .split(/[;,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set();
  const valid = [];
  for (const candidate of candidates) {
    if (EMAIL_RE.test(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      valid.push(candidate);
    }
  }
  return valid;
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
  // Dedupe within THIS file only, keyed on (domain + email) — not domain
  // alone — so a domain with 20 addresses produces 20 drafts, while an
  // exact repeat of the same domain+email pair within the file is skipped.
  const seenPairs = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[urlColIndex]) continue;

    const websiteUrl = normalizeUrl(row[urlColIndex]);
    if (!websiteUrl) continue;

    const domain = extractDomain(websiteUrl);
    if (!domain) continue;

    const emails = emailColIndex >= 0 ? extractEmails(row[emailColIndex]) : [];

    if (emails.length === 0) {
      // No valid email found for this row — still track the domain (as
      // "Not found") so it shows up and can be scraped later, but only
      // once per domain.
      const key = `${domain}|`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      prospects.push({
        websiteUrl,
        domain,
        email: null,
        emailSource: null
      });
      continue;
    }

    // One prospect draft per email found — this is what makes every
    // address in a multi-email cell actually contactable.
    for (const email of emails) {
      const key = `${domain}|${email}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);

      prospects.push({
        websiteUrl,
        domain,
        email,
        emailSource: 'uploaded'
      });
    }
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

    // Dedupe against what's already in the DB by (domain, email) — NOT by
    // domain alone — so a domain that already has 2 of its 5 emails saved
    // still gets the other 3 inserted instead of being skipped entirely.
    const existingProspects = await Prospect.find(
      { campaign: campaign._id },
      { domain: 1, email: 1 }
    ).lean();
    const existingPairs = new Set(
      existingProspects.map(p => `${p.domain}|${p.email || ''}`)
    );

    const newProspects = prospects.filter(
      p => !existingPairs.has(`${p.domain}|${p.email || ''}`)
    );

    // Insert new prospects. The unique (campaign, domain, email) index on
    // the model is the real source of truth for dedupe — insertMany with
    // ordered:false still inserts every non-conflicting doc even if a race
    // or an in-file edge case slips one duplicate through.
    let inserted = 0;
    const skipped = prospects.length - newProspects.length;

    if (newProspects.length > 0) {
      const docs = newProspects.map(p => ({
        ...p,
        campaign: campaign._id,
        user: req.user._id
      }));

      try {
        const result = await Prospect.insertMany(docs, { ordered: false });
        inserted = result.length;
      } catch (err) {
        // Some docs can still fail on a duplicate key race; count only
        // what actually made it into the DB rather than assuming success.
        if (err.code !== 11000 && err.code !== undefined) throw err;
        inserted = err.insertedDocs ? err.insertedDocs.length : 0;
      }
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