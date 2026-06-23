import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read benchmarks.json
const benchmarks = JSON.parse(
  readFileSync(path.join(__dirname, 'benchmarks.json'), 'utf8')
);

/**
 * Executes deterministic rules against metrics to generate flags and deltas.
 * @param {Object} metrics 
 * @param {string} pageType 
 * @returns {Object} { flags, benchmarkDeltas }
 */
export function runRules(metrics, pageType) {
  const benchmark = benchmarks[pageType] || benchmarks['homepage'];
  const flags = [];
  const benchmarkDeltas = {};

  const {
    wordCount,
    h1Count,
    ctaCount,
    internalLinks,
    externalLinks,
    imagesTotal,
    imagesMissingAlt,
    metaTitle,
    metaDescription
  } = metrics;

  // Compute Alt Text Percent
  const altTextPct = imagesTotal > 0 ? (imagesMissingAlt / imagesTotal) : 0;

  // -- 1. Flags generation --

  // CRITICAL: No H1 tag
  if (h1Count === 0) {
    flags.push({
      severity: 'CRITICAL',
      issue: 'h1_missing',
      value: `h1_count: 0`,
      description: 'The page completely lacks an H1 tag, which is essential for SEO search engine indexing.'
    });
  } else if (h1Count > 1) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'multiple_h1',
      value: `h1_count: ${h1Count}`,
      description: 'The page has multiple H1 tags, which dilutes SEO authority and confuses crawlers.'
    });
  }

  // HIGH: Thin content
  if (wordCount < benchmark.word_count.min) {
    flags.push({
      severity: 'HIGH',
      issue: 'thin_content',
      value: `word_count: ${wordCount} (min: ${benchmark.word_count.min})`,
      description: `Word count is below the recommended minimum of ${benchmark.word_count.min} for ${pageType.replace('_', ' ')}s.`
    });
  }

  // HIGH: Image alt text gaps
  if (imagesTotal > 0 && altTextPct > 0.5) {
    flags.push({
      severity: 'HIGH',
      issue: 'alt_text_gap',
      value: `${imagesMissingAlt}/${imagesTotal} images missing alt text`,
      description: 'More than 50% of the images on this page lack alternative description text, affecting accessibility and SEO.'
    });
  }

  // MEDIUM: Excess CTAs
  if (ctaCount > benchmark.cta_count.max) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'excess_ctas',
      value: `cta_count: ${ctaCount} (max: ${benchmark.cta_count.max})`,
      description: `There are more CTAs than recommended (${benchmark.cta_count.max}), which may overwhelm the user and reduce conversion focus.`
    });
  } else if (ctaCount < benchmark.cta_count.min) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'missing_ctas',
      value: `cta_count: ${ctaCount} (min: ${benchmark.cta_count.min})`,
      description: `The page has fewer CTAs than recommended (${benchmark.cta_count.min}), potentially missing opportunities for user conversion.`
    });
  }

  // MEDIUM: Missing or too short meta description
  if (!metaDescription) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'meta_description_missing',
      value: 'Meta description is missing',
      description: 'A missing meta description reduces CTR since search engines must auto-generate a snippet.'
    });
  } else if (metaDescription.length < 50) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'meta_description_short',
      value: `Meta description length: ${metaDescription.length} chars`,
      description: 'The meta description is too short (under 50 characters) to convey adequate context to search engines.'
    });
  }

  // LOW: External links outnumber internal links
  if (externalLinks > internalLinks) {
    flags.push({
      severity: 'LOW',
      issue: 'external_links_heavy',
      value: `external: ${externalLinks}, internal: ${internalLinks}`,
      description: 'There are more outbound links than internal website links, leaking page authority away from your domain.'
    });
  }


  // -- 2. Delta Computation --

  // Word count delta
  if (wordCount < benchmark.word_count.min) {
    const diffPct = Math.round(((benchmark.word_count.min - wordCount) / benchmark.word_count.min) * 100);
    benchmarkDeltas.word_count = `-${diffPct}% below minimum (${benchmark.word_count.min})`;
  } else if (wordCount > benchmark.word_count.max) {
    const diffPct = Math.round(((wordCount - benchmark.word_count.max) / benchmark.word_count.max) * 100);
    benchmarkDeltas.word_count = `+${diffPct}% above maximum (${benchmark.word_count.max})`;
  } else {
    benchmarkDeltas.word_count = 'within ideal range';
  }

  // CTA delta
  if (ctaCount < benchmark.cta_count.min) {
    benchmarkDeltas.cta_count = `below minimum (min: ${benchmark.cta_count.min})`;
  } else if (ctaCount > benchmark.cta_count.max) {
    const diffPct = Math.round(((ctaCount - benchmark.cta_count.max) / benchmark.cta_count.max) * 100);
    benchmarkDeltas.cta_count = `+${diffPct}% above maximum (${benchmark.cta_count.max})`;
  } else {
    benchmarkDeltas.cta_count = 'within ideal range';
  }

  // Alt text pct delta
  if (altTextPct > benchmark.alt_text_pct.max) {
    const diffPct = Math.round((altTextPct - benchmark.alt_text_pct.max) * 100);
    benchmarkDeltas.alt_text = `+${diffPct}% above maximum threshold (${benchmark.alt_text_pct.max * 100}%)`;
  } else {
    benchmarkDeltas.alt_text = 'within ideal range';
  }

  return {
    flags,
    benchmarkDeltas
  };
}
