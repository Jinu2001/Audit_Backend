import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeUrl } from '../scraper/index.js';
import { classifyPage } from '../analyzer/pageClassifier.js';
import { runRules } from '../analyzer/rules.js';
import { buildPrompts } from '../analyzer/buildPrompt.js';
import { getAiInsights } from '../analyzer/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`Starting audit for: ${url}`);

    // Step 1: Scrape URL
    const rawMetrics = await scrapeUrl(url);

    // Step 2: Classify Page
    const pageType = classifyPage(rawMetrics, url);

    // Step 3: Run Deterministic Rules & Benchmarks
    const { flags, benchmarkDeltas } = runRules(rawMetrics, pageType);

    // Step 4: Build Prompt
    const auditData = {
      url,
      pageType,
      metrics: rawMetrics,
      benchmarkDeltas,
      flags
    };
    const { systemPrompt, userPrompt } = buildPrompts(auditData);

    // Step 5: Query AI
    const aiResponse = await getAiInsights(systemPrompt, userPrompt);

    // Enforce unique sequential priorities for recommendations
    if (aiResponse.recommendations && Array.isArray(aiResponse.recommendations)) {
      aiResponse.recommendations.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      aiResponse.recommendations = aiResponse.recommendations.map((rec, index) => {
        rec.priority = index + 1;
        return rec;
      });
    }

    // Step 6: Append audit log entry to logs/logs.json
    const logsDir = path.join(__dirname, '..', 'logs');
    const logsFile = path.join(logsDir, 'logs.json');
    try {
      await fs.mkdir(logsDir, { recursive: true });

      // Read existing logs or start fresh
      let existingLogs = [];
      try {
        const raw = await fs.readFile(logsFile, 'utf8');
        existingLogs = JSON.parse(raw);
      } catch (_) {
        existingLogs = [];
      }

      // Append new entry
      existingLogs.push({
        timestamp: new Date().toISOString(),
        url,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        raw_output: aiResponse
      });

      await fs.writeFile(logsFile, JSON.stringify(existingLogs, null, 2), 'utf8');
      console.log('Saved prompt log to logs.json');
    } catch (logError) {
      console.error('Error writing logs.json:', logError.message);
    }

    // Step 7: Format and return final response
    const finalResponse = {
      metrics: {
        word_count: rawMetrics.wordCount,
        h1_count: rawMetrics.h1Count,
        h2_count: rawMetrics.h2Count,
        h3_count: rawMetrics.h3Count,
        cta_count: rawMetrics.ctaCount,
        internal_links: rawMetrics.internalLinks,
        external_links: rawMetrics.externalLinks,
        images_total: rawMetrics.imagesTotal,
        images_missing_alt: rawMetrics.imagesMissingAlt,
        images_missing_alt_pct: rawMetrics.imagesMissingAltPct,
        meta_title: rawMetrics.metaTitle,
        meta_description: rawMetrics.metaDescription,
        is_spa: rawMetrics.isSpa
      },
      page_type: pageType,
      flags,
      insights: aiResponse.insights,
      recommendations: aiResponse.recommendations,
      screenshot: rawMetrics.screenshot,
      prompt_logs: {
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        raw_output: JSON.stringify(aiResponse, null, 2)
      }
    };

    return res.json(finalResponse);

  } catch (error) {
    console.error(`Audit failed for ${url}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
