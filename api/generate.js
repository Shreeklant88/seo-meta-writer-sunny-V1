// A more robust model chain, prioritizing stable free-tier models first.
const GEMINI_MODEL_CHAIN = [
  "gemini-3.5-flash-lite",  // Primary: Most reliable free-tier model
  "gemini-3.6-flash",       // Secondary: Higher quality fallback
  "gemini-3.8-flash"        // Tertiary: Newest Flash fallback
];

async function callGeminiWithFallback(prompt, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODEL_CHAIN) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": apiKey,
            },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (response.ok) {
          return response; // Success
        }

        // If the error is 503 (UNAVAILABLE), retry with exponential backoff
        if (response.status === 503) {
          lastError = await response.text();
          console.warn(`Model ${model} returned 503. Retrying (attempt ${attempt + 1})...`);
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For other errors (e.g., 404), don't retry this model, move to the next.
          lastError = await response.text();
          break; 
        }
      } catch (error) {
        lastError = error.message;
        console.error(`Fetch error for model ${model}:`, error);
        break;
      }
    }
  }
  
  // If we get here, all models failed
  throw new Error(`All models failed. Last error: ${lastError}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content } = req.body;
  if (!content || content.trim().length < 20) {
    return res.status(400).json({ error: "Please paste at least 20 characters of content." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured in Vercel." });

  const prompt = `
You are an expert SEO copywriter. Write exactly three meta descriptions for the following page content.
Rules:
- Each description must be between 150 and 155 characters.
- Front-load the primary keyword idea in the first 110 characters.
- Use an active voice and include a soft call to action.
- Do not use quotation marks around the descriptions.
- Return only the three descriptions, each on its own line, with no numbering or bullet points.

PAGE CONTENT:
"""${content.slice(0, 3000)}"""
`;

  try {
    const geminiResponse = await callGeminiWithFallback(prompt, apiKey);
    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const descriptions = rawText
      .split("\n")
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line) => line.length >= 100 && line.length <= 200)
      .slice(0, 3);

    if (descriptions.length === 0) {
      return res.status(502).json({ error: "AI returned an unusable response. Please try different content." });
    }

    return res.status(200).json({ descriptions });

  } catch (error) {
    console.error("Final Server Error:", error.message);
    // This is the user-friendly message if all models truly fail.
    return res.status(500).json({ error: "The AI is currently experiencing extremely high demand. Please try again in a minute." });
  }
};
