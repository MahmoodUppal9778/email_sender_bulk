const fs = require('fs');
const path = require('path');

/* =========================================================================
 * 1) CSV PARSING — handles quoted fields (commas/quotes inside Title, etc.)
 *    and splits multi-value "Emails" cells like:
 *      "submissions@cdainstitute.ca; pauline@cdainstitute.ca"
 *    into a full array. ALL valid emails are kept — nothing is dropped.
 * ======================================================================= */

// Minimal RFC4180-ish CSV line parser (handles quoted fields with embedded
// commas/quotes, which the Title column in your export relies on).
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const src = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    const next = src[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Splits a raw "Emails" cell into a clean array of ALL valid, deduped,
// lowercase email addresses. Handles ";" and "," separators and whitespace.
// Nothing is discarded except genuinely invalid tokens.
function extractEmails(rawCell) {
  if (!rawCell) return [];

  const candidates = rawCell
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

// Parses your seo-prospects export into structured prospect objects.
// Expected header: URL,Domain,Title,Niche,Country,Opportunity Type,Emails
// `emails` holds EVERY valid address found for that row — none are dropped.
function parseProspectsCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsvText(text);
  if (rows.length === 0) return [];

  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = {
    url: header.indexOf('url'),
    domain: header.indexOf('domain'),
    title: header.indexOf('title'),
    niche: header.indexOf('niche'),
    country: header.indexOf('country'),
    opportunityType: header.indexOf('opportunity type'),
    emails: header.indexOf('emails'),
  };

  const prospects = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.every(c => c === '')) continue;

    const emails = idx.emails >= 0 ? extractEmails(cols[idx.emails]) : [];

    prospects.push({
      url: idx.url >= 0 ? cols[idx.url] : '',
      domain: idx.domain >= 0 ? cols[idx.domain] : '',
      title: idx.title >= 0 ? cols[idx.title] : '',
      niche: idx.niche >= 0 ? cols[idx.niche] : '',
      country: idx.country >= 0 ? cols[idx.country] : '',
      opportunityType: idx.opportunityType >= 0 ? cols[idx.opportunityType] : '',
      emails, // ALL valid emails for this row, in the order found
      status: emails.length > 0 ? 'pending' : 'not_found',
    });
  }

  return prospects;
}

/* =========================================================================
 * 2) EXPAND TO ONE TARGET PER EMAIL
 *    A domain like big.dk with 20 emails becomes 20 separate send targets,
 *    each carrying the same domain/niche/title context. This is what makes
 *    "pick all mentioned emails" actually contactable one-by-one.
 * ======================================================================= */

// maxEmailsPerDomain lets you optionally cap how many addresses from the
// same domain get contacted (e.g. big.dk had 20 aliases) — defaults to no
// cap, so by default every email found is included.
function expandProspectsToEmailTargets(prospects, { maxEmailsPerDomain = Infinity } = {}) {
  const targets = [];
  for (const p of prospects) {
    const emails = p.emails.slice(0, maxEmailsPerDomain);
    for (const email of emails) {
      targets.push({
        url: p.url,
        domain: p.domain,
        title: p.title,
        niche: p.niche,
        country: p.country,
        opportunityType: p.opportunityType,
        email,
      });
    }
  }
  return targets;
}

/* =========================================================================
 * 3) SENT-HISTORY STORE — prevents emailing the same address twice, and can
 *    be exported/imported so multiple copies of this app never duplicate
 *    sends against each other.
 *
 *    Format on disk (JSON):
 *      {
 *        "version": 1,
 *        "sent": {
 *          "contact@architectsinsight.com": {
 *            "domain": "architectsinsight.com",
 *            "campaign": "guestPost",
 *            "sentAt": "2026-09-27T12:00:00.000Z"
 *          },
 *          ...
 *        }
 *      }
 * ======================================================================= */

function loadSentHistory(filePath) {
  if (!fs.existsSync(filePath)) {
    return { version: 1, sent: {} };
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.sent) parsed.sent = {};
    return parsed;
  } catch (err) {
    throw new Error(`Sent-history file at ${filePath} is corrupted: ${err.message}`);
  }
}

function saveSentHistory(filePath, history) {
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
}

function hasBeenSent(history, email) {
  if (!email) return false;
  return Boolean(history.sent[email.toLowerCase()]);
}

function recordSent(history, email, meta = {}) {
  const key = email.toLowerCase();
  history.sent[key] = {
    domain: meta.domain || null,
    campaign: meta.campaign || null,
    sentAt: new Date().toISOString(),
  };
  return history;
}

/* ---- Export ----
 * Writes the current history to its own standalone JSON file. Copy this
 * file to another machine/app instance and import it there (see below)
 * to keep both copies in sync and avoid duplicate sends between them. */
function exportSentHistory(history, exportPath) {
  fs.writeFileSync(exportPath, JSON.stringify(history, null, 2), 'utf8');
  return exportPath;
}

/* ---- Import ----
 * Merges an imported history file/object into an existing one. Safe to
 * run repeatedly and in either direction (A→B or B→A) — it's a union
 * keyed by lowercased email address, so:
 *   - importing the same file twice never creates duplicates
 *   - an email already marked "sent" in either copy stays marked "sent"
 *   - if both copies somehow sent to the same address, the EARLIER
 *     timestamp is kept, since that's the one that actually happened first
 * Returns the merged history plus how many *new* records were added, so
 * you can confirm the merge actually did something. */
function importSentHistory(existingHistory, importedHistoryOrPath) {
  const imported = typeof importedHistoryOrPath === 'string'
    ? loadSentHistory(importedHistoryOrPath)
    : importedHistoryOrPath;

  let mergedCount = 0;
  let conflictsResolved = 0;

  for (const [email, meta] of Object.entries(imported.sent || {})) {
    if (!existingHistory.sent[email]) {
      existingHistory.sent[email] = meta;
      mergedCount++;
    } else {
      const existingDate = new Date(existingHistory.sent[email].sentAt);
      const importedDate = new Date(meta.sentAt);
      if (importedDate < existingDate) {
        existingHistory.sent[email] = meta;
        conflictsResolved++;
      }
    }
  }
  return { history: existingHistory, mergedCount, conflictsResolved };
}

/* =========================================================================
 * 4) PUTTING IT TOGETHER — filters ALL email targets against history
 * ======================================================================= */

// Returns every email target that has NOT already been contacted.
// Nothing is limited to "one per domain" here — every distinct address
// found in the CSV is a candidate unless it's already in the history.
function getSendableTargets(prospects, history, opts = {}) {
  const allTargets = expandProspectsToEmailTargets(prospects, opts);
  return allTargets.filter(t => !hasBeenSent(history, t.email));
}

module.exports = {
  parseCsvText,
  extractEmails,
  parseProspectsCSV,
  expandProspectsToEmailTargets,
  loadSentHistory,
  saveSentHistory,
  hasBeenSent,
  recordSent,
  exportSentHistory,
  importSentHistory,
  getSendableTargets,
};

/* =========================================================================
 * Example: wiring this into your existing outreach_mailer.js
 * =========================================================================
 *
 * const path = require('path');
 * const {
 *   parseProspectsCSV, loadSentHistory, saveSentHistory,
 *   recordSent, getSendableTargets, exportSentHistory,
 * } = require('./prospect_pipeline');
 * const {
 *   defaultTemplates, personalizeEmail, createTransporter, sendEmail,
 * } = require('./outreach_mailer');
 *
 * async function runCampaign() {
 *   const historyPath = path.join(__dirname, 'sent_history.json');
 *   const history = loadSentHistory(historyPath);
 *
 *   const prospects = parseProspectsCSV(
 *     path.join(__dirname, 'seo-prospects-1790490137025.csv')
 *   );
 *
 *   // Every email in every row is a candidate target (not just the first).
 *   const targets = getSendableTargets(prospects, history);
 *
 *   const transporter = createTransporter(process.env.GMAIL_USER, process.env.GMAIL_APP_PASSWORD);
 *
 *   for (const target of targets) {
 *     const data = { siteName: target.domain, domain: target.domain, niche: target.niche };
 *     const subject = personalizeEmail(defaultTemplates.guestPost.subject, data);
 *     const html = personalizeEmail(defaultTemplates.guestPost.htmlBody, data);
 *     const text = personalizeEmail(defaultTemplates.guestPost.textBody, data);
 *
 *     const result = await sendEmail(transporter, {
 *       to: target.email,
 *       from: process.env.GMAIL_USER,
 *       subject, html, text,
 *     });
 *
 *     if (result.success) {
 *       recordSent(history, target.email, { domain: target.domain, campaign: 'guestPost' });
 *       saveSentHistory(historyPath, history); // persist after every send
 *     }
 *   }
 *
 *   // Share this file with another copy of the app to keep both in sync:
 *   exportSentHistory(history, path.join(__dirname, 'sent_history_export.json'));
 * }
 *
 * // On the OTHER copy of the app, before running its own campaign:
 * //   const { history } = importSentHistory(loadSentHistory(localHistoryPath), '/path/to/sent_history_export.json');
 * //   saveSentHistory(localHistoryPath, history);
 */