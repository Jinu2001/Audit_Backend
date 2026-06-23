import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Calls the Google Gemini 2.5 Flash API to get insights.
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @returns {Promise<Object>} The parsed JSON response
 */
export async function getAiInsights(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('GEMINI_API_KEY is not set or using placeholder. Returning mock analysis.');
    return getMockResponse();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-2.5-flash as requested
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON. Raw output:', responseText);
      throw new Error('Gemini response was not valid JSON');
    }
  } catch (error) {
    console.error('Error invoking Gemini API:', error.message);
    throw error;
  }
}

/**
 * Returns a fallback/mock response if API key is not configured.
 */
function getMockResponse() {
  return {
    insights: {
      seo_structure: "WARNING: GEMINI_API_KEY is not configured in backend/.env. Setup structural analysis by adding your key. Standard guidelines recommend exactly one H1 tag per page.",
      messaging_clarity: "WARNING: GEMINI_API_KEY is missing. Brand messaging evaluation requires the API key configured to analyze the text structure.",
      cta_usage: "WARNING: GEMINI_API_KEY is missing. Conversion action optimization is unavailable. General recommendation is 1-2 CTAs for landing pages.",
      content_depth: "WARNING: GEMINI_API_KEY is missing. Content density insights require Gemini integration.",
      ux_concerns: "WARNING: GEMINI_API_KEY is missing. Layout and user path feedback is disabled."
    },
    recommendations: [
      {
        priority: 1,
        action: "Set up GEMINI_API_KEY in the backend/.env file",
        reason: "The AI analysis is currently running in fallback mock mode because no Google Gemini API Key was found.",
        metric: "GEMINI_API_KEY: missing"
      }
    ]
  };
}
