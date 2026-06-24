import axios from 'axios';

/**
 * Base helper to call the Groq Chat Completions API.
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode Whether to enforce JSON mode
 * @returns {Promise<Object|string>} Parsed JSON if jsonMode is true, otherwise raw string
 */
export async function callGroq(systemPrompt, userPrompt, jsonMode = true) {
  const apiKey = process.env.GROQ_API_KEY;
  const modelName = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured in the environment.');
  }

  try {
    const requestData = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1024
    };

    if (jsonMode) {
      requestData.response_format = { type: 'json_object' };
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000 // 25 seconds timeout
      }
    );

    let responseText = response.data.choices[0].message.content.trim();
    
    // Strip markdown code block wrapper if present
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    if (jsonMode) {
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Groq response as JSON. Raw output:', responseText);
        throw new Error('Groq response was not valid JSON');
      }
    }

    return responseText;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Error invoking Groq API:', errorDetails);
    throw new Error(`Groq API call failed: ${error.message}`);
  }
}

/**
 * Calls the Groq API (Llama 3.1 8B Instant) to get insights.
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @returns {Promise<Object>} The parsed JSON response
 */
export async function getAiInsights(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn('GROQ_API_KEY is not set or using placeholder. Returning mock analysis.');
    return getMockResponse();
  }

  return callGroq(systemPrompt, userPrompt, true);
}

/**
 * Returns a fallback/mock response if API key is not configured.
 */
function getMockResponse() {
  return {
    insights: {
      seo_structure: "WARNING: GROQ_API_KEY is not configured in .env. Setup structural analysis by adding your key.",
      messaging_clarity: "WARNING: GROQ_API_KEY is missing. Brand messaging evaluation requires the API key.",
      cta_usage: "WARNING: GROQ_API_KEY is missing. Conversion action optimization is unavailable.",
      content_depth: "WARNING: GROQ_API_KEY is missing. Content density insights require Groq integration.",
      ux_concerns: "WARNING: GROQ_API_KEY is missing. Layout and user path feedback is disabled."
    },
    recommendations: [
      {
        priority: 1,
        action: "Set up GROQ_API_KEY in the .env file",
        reason: "The AI analysis is currently running in fallback mock mode because no Groq API Key was found.",
        metric: "GROQ_API_KEY: missing"
      }
    ]
  };
}
