import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

/**
 * Scrapes a URL and extracts raw HTML metrics using Playwright.
 * @param {string} urlString 
 * @returns {Promise<Object>}
 */
export async function scrapeUrl(urlString) {
  try {
    if (!urlString || typeof urlString !== 'string') {
      throw new Error('A valid URL string is required');
    }

    let targetUrl = urlString.trim();
    let autoAddedProtocol = false;
    
    // Add protocol if missing, default to https
    if (!/^https?:\/\//i.test(targetUrl)) {
      // Check if it has some other protocol (like file://, ftp://, chrome://)
      if (/^[a-z0-9+.-]+:\/\//i.test(targetUrl)) {
        throw new Error('Only http:// and https:// URLs are allowed');
      }
      targetUrl = 'https://' + targetUrl;
      autoAddedProtocol = true;
    }

    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only http:// and https:// URLs are allowed');
    }

    // Block local/internal hostnames
    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (localHosts.includes(parsedUrl.hostname) || parsedUrl.hostname.endsWith('.local')) {
      throw new Error('Auditing local or internal domains is not allowed');
    }

    let html;
    let finalUrl = targetUrl;
    let domain;
    let screenshotBase64 = null;

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      // Set desktop size for the screenshot
      await page.setViewportSize({ width: 1280, height: 800 });
      
      try {
        // Navigate and wait for DOM
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Wait a bit for JS frameworks (like React/Vite) to populate the root div
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        finalUrl = page.url();
      } catch (error) {
        // If we auto-added https:// and it failed, fallback to http://
        if (autoAddedProtocol && (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('ERR_CERT_'))) {
          console.warn(`HTTPS failed for ${urlString}, falling back to HTTP...`);
          targetUrl = 'http://' + urlString;
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          finalUrl = page.url();
        } else {
          throw error;
        }
      }

      const parsedUrl = new URL(finalUrl);
      domain = parsedUrl.hostname;

      html = await page.content();

      // Capture lightweight base64 screenshot
      try {
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 65 });
        screenshotBase64 = screenshotBuffer.toString('base64');
      } catch (scrError) {
        console.warn(`Failed to capture screenshot: ${scrError.message}`);
      }
    } finally {
      await browser.close();
    }

    const $ = cheerio.load(html);

    // (Text extraction moved to the end of the script to avoid stripping DOM elements before counting links)

    // 2. Heading counts
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    // 3. CTA count (buttons + primary action links)
    // Primary action links include class names matching btn/button/cta or specific action-oriented texts.
    let ctaCount = 0;
    const ctaKeywords = /sign\s*up|get\s*started|book|contact|buy|register|download|subscribe|join|demo|try|start\s*free/i;
    
    $('button, input[type="button"], input[type="submit"]').each(() => {
      ctaCount++;
    });

    $('a').each((i, el) => {
      const text = $(el).text().trim();
      const className = $(el).attr('class') || '';
      const idName = $(el).attr('id') || '';
      
      const isCtaClass = /btn|button|cta|action/i.test(className) || /btn|button|cta|action/i.test(idName);
      const isCtaText = ctaKeywords.test(text);

      if (isCtaClass || isCtaText) {
        ctaCount++;
      }
    });

    // 4. Internal vs external link counts
    let internalLinks = 0;
    let externalLinks = 0;

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      // Ignore anchors, mails, phones, javascript
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return;
      }

      try {
        const linkUrl = new URL(href, targetUrl);
        if (linkUrl.hostname === domain) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch (err) {
        // Fallback for relative paths if URL creation fails
        if (href.startsWith('/') || href.startsWith('.')) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      }
    });

    // 5. Total image count + images missing alt text
    const images = $('img');
    const imagesTotal = images.length;
    let imagesMissingAlt = 0;

    images.each((i, el) => {
      const alt = $(el).attr('alt');
      // If alt is missing or is just whitespace/empty (unless decorative but standard marketing pages usually want real alt text)
      if (alt === undefined || alt === null || alt.trim() === '') {
        imagesMissingAlt++;
      }
    });

    const imagesMissingAltPct = imagesTotal > 0 
      ? Math.round((imagesMissingAlt / imagesTotal) * 100) + '%' 
      : '0%';

    // 6. Meta title and meta description
    const metaTitle = $('title').first().text() || $('meta[property="og:title"]').attr('content') || '';
    const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

    // Now clean up DOM for text extraction
    $('script, style, svg, noscript, iframe, video').remove();

    // 1. Word count (clean text of body excluding scripts/styles, but keeping nav/footer for standard word count)
    const bodyText = $('body').text() || '';
    const cleanBodyText = bodyText.replace(/\s+/g, ' ').trim();
    const words = cleanBodyText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // 7. Content sample (extract from main if possible, and exclude nav/footer/carousels for cleaner signal)
    $('nav, footer, header').remove();
    $('.carousel, [class*="carousel"], [class*="slider"]').remove();
    
    const mainText = $('main').length > 0 ? $('main').text() : $('body').text() || '';
    const cleanMainText = mainText.replace(/\s+/g, ' ').trim();
    const contentSample = cleanMainText.substring(0, 800);

    // 8. SPA detection flag (if word count < 50)
    const isSpa = wordCount < 50;

    return {
      wordCount,
      h1Count,
      h2Count,
      h3Count,
      ctaCount,
      internalLinks,
      externalLinks,
      imagesTotal,
      imagesMissingAlt,
      imagesMissingAltPct,
      metaTitle,
      metaDescription,
      contentSample,
      isSpa,
      screenshot: screenshotBase64
    };

  } catch (error) {
    console.error('Error during scraping:', error.message);
    if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Could not reach the website. Please check if the URL is spelled correctly and the site is online.');
    }
    throw new Error(`Failed to scrape the URL: ${error.message}`);
  }
}
