/**
 * Classifies a page type based on extracted metrics.
 * @param {Object} metrics 
 * @returns {string} One of 'landing_page', 'blog_post', 'homepage'
 */
export function classifyPage(metrics, urlString) {
  const { wordCount, h2Count, ctaCount, internalLinks } = metrics;

  try {
    if (urlString) {
      const parsedUrl = new URL(urlString);
      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        return 'homepage';
      }
    }
  } catch (e) {
    // Ignore URL parsing errors and fallback to heuristics
  }

  // Rule 1: blog_post
  if (wordCount > 800 && h2Count > 3) {
    return 'blog_post';
  }

  // Rule 2: landing_page
  if (ctaCount > 2 && wordCount < 700) {
    return 'landing_page';
  }

  // Rule 3: homepage
  if (internalLinks > 8) {
    return 'homepage';
  }

  // Fallback defaults
  if (wordCount < 500) {
    return 'landing_page';
  } else if (wordCount > 1000) {
    return 'blog_post';
  } else {
    return 'homepage';
  }
}
