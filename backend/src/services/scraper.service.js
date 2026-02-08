const axios = require('axios');
const cheerio = require('cheerio');
const validator = require('validator');

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Common niche keywords for categorization
const nicheKeywords = {
  technology: ['tech', 'software', 'app', 'digital', 'computer', 'programming', 'code', 'developer', 'startup', 'saas', 'ai', 'machine learning'],
  health: ['health', 'fitness', 'wellness', 'medical', 'nutrition', 'diet', 'exercise', 'mental health', 'healthcare'],
  finance: ['finance', 'money', 'investment', 'banking', 'crypto', 'trading', 'stock', 'insurance', 'loan'],
  travel: ['travel', 'tourism', 'vacation', 'hotel', 'flight', 'destination', 'adventure', 'trip'],
  food: ['food', 'recipe', 'cooking', 'restaurant', 'cuisine', 'chef', 'baking', 'nutrition'],
  fashion: ['fashion', 'style', 'clothing', 'beauty', 'makeup', 'skincare', 'trend'],
  education: ['education', 'learning', 'course', 'training', 'school', 'university', 'study', 'tutorial'],
  business: ['business', 'marketing', 'entrepreneur', 'management', 'strategy', 'sales', 'ecommerce', 'b2b'],
  lifestyle: ['lifestyle', 'home', 'family', 'parenting', 'relationship', 'self-improvement'],
  entertainment: ['entertainment', 'movie', 'music', 'gaming', 'sports', 'celebrity', 'streaming']
};

// Detect niche from content
function detectNiche(text) {
  text = text.toLowerCase();
  let bestMatch = { niche: 'general', score: 0 };

  Object.entries(nicheKeywords).forEach(([niche, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    });
    if (score > bestMatch.score) {
      bestMatch = { niche, score };
    }
  });

  return bestMatch.niche;
}

// Extract keywords from text
function extractKeywords(text, limit = 5) {
  // Remove common words and get meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'can', 'your', 'our', 'their'
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

// Scrape website data for personalization
async function scrapeWebsiteData(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Extract site name
    let siteName = $('meta[property="og:site_name"]').attr('content')
      || $('meta[name="application-name"]').attr('content')
      || $('title').first().text().split('|')[0].split('-')[0].trim()
      || new URL(url).hostname.replace('www.', '');

    // Extract description
    const description = $('meta[name="description"]').attr('content')
      || $('meta[property="og:description"]').attr('content')
      || $('p').first().text().substring(0, 200);

    // Get page text for analysis
    $('script, style, nav, footer, header, aside').remove();
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();

    // Detect niche
    const combinedText = `${siteName} ${description} ${pageText.substring(0, 2000)}`;
    const niche = detectNiche(combinedText);

    // Extract keywords
    const keywords = extractKeywords(combinedText);

    // Find contact page URL
    let contactPageUrl = null;
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase();
      if (text.includes('contact') || href.includes('contact') || href.includes('about')) {
        try {
          contactPageUrl = new URL(href, url).href;
          return false; // Break loop
        } catch {}
      }
    });

    return {
      siteName: siteName.substring(0, 100),
      description: description?.substring(0, 500),
      niche,
      keywords,
      contactPageUrl,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error.message);
    return null;
  }
}

// Find email from website
async function findEmailFromWebsite(url) {
  try {
    // Try homepage first
    let emails = await scrapeEmailsFromPage(url);
    
    if (emails.length === 0) {
      // Try contact page
      const contactUrls = [
        new URL('/contact', url).href,
        new URL('/contact-us', url).href,
        new URL('/about', url).href,
        new URL('/about-us', url).href
      ];

      for (const contactUrl of contactUrls) {
        try {
          emails = await scrapeEmailsFromPage(contactUrl);
          if (emails.length > 0) break;
        } catch {}
      }
    }

    // Filter and return best email
    const preferredPatterns = ['contact', 'info', 'hello', 'admin', 'editor', 'blog'];
    
    // Sort by preference
    emails.sort((a, b) => {
      const aScore = preferredPatterns.findIndex(p => a.includes(p));
      const bScore = preferredPatterns.findIndex(p => b.includes(p));
      if (aScore >= 0 && bScore < 0) return -1;
      if (bScore >= 0 && aScore < 0) return 1;
      return 0;
    });

    return emails[0] || null;
  } catch (error) {
    console.error(`Failed to find email for ${url}:`, error.message);
    return null;
  }
}

// Scrape emails from a page
async function scrapeEmailsFromPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const pageText = $.html();

    // Email regex pattern
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = pageText.match(emailRegex) || [];

    // Filter and deduplicate
    const emails = [...new Set(matches)]
      .filter(email => {
        // Skip image files and common false positives
        if (email.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return false;
        if (email.includes('example.com')) return false;
        if (email.includes('yourdomain')) return false;
        if (email.includes('email.com')) return false;
        if (!validator.isEmail(email)) return false;
        return true;
      })
      .slice(0, 5);

    return emails;
  } catch (error) {
    return [];
  }
}

module.exports = {
  scrapeWebsiteData,
  findEmailFromWebsite,
  detectNiche,
  extractKeywords
};
