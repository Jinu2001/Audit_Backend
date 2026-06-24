/**
 * Compiles the system and user prompts to be sent to Gemini.
 * Includes few-shot examples.
 */
export function buildPrompts(data) {
  const systemPrompt = `You are a senior digital strategist. Analyze the webpage's metrics, flags, and content sample, and return high-impact business insights.
CRITICAL:
1. Every insight must cite specific metrics by name and value (e.g. "cta_count: 5").
2. Only address pre-computed flags and the content_sample. No hallucinations.
3. Return a RAW JSON object matching this schema (NO markdown code block wrappers like \`\`\`json):
{
  "insights": {
    "seo_structure": "[Write analysis of structural search visibility here]",
    "messaging_clarity": "[Write brand value proposition/clarity analysis here]",
    "cta_usage": "[Write CTA frequency, positioning, and conversion friction analysis here]",
    "content_depth": "[Write word count alignment and SEO depth analysis here]",
    "ux_concerns": "[Write layout logic, user journey friction, and accessibility/alt text analysis here]"
  },
  "recommendations": [
    {
      "priority": 1,
      "action": "[Actionable instruction]",
      "reason": "[Business/technical reason citing the metric]",
      "metric": "[Metric name & value]"
    }
  ]
}
Replace all bracketed placeholders with your actual analysis.`;

  const userPrompt = JSON.stringify({
    url: data.url,
    page_type: data.pageType,
    metrics: {
      wordCount: data.metrics.wordCount,
      h1Count: data.metrics.h1Count,
      h2Count: data.metrics.h2Count,
      ctaCount: data.metrics.ctaCount,
      internalLinks: data.metrics.internalLinks,
      externalLinks: data.metrics.externalLinks,
      imagesTotal: data.metrics.imagesTotal,
      imagesMissingAlt: data.metrics.imagesMissingAlt,
      metaTitle: data.metrics.metaTitle,
      metaDescription: data.metrics.metaDescription
    },
    benchmark_deltas: data.benchmarkDeltas,
    flags: data.flags.map(f => ({
      severity: f.severity,
      issue: f.issue,
      value: f.value
    })),
    content_sample: data.metrics.contentSample
  });

  return {
    systemPrompt,
    userPrompt
  };
}
