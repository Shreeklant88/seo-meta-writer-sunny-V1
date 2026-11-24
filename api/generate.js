const GEMINI_MODEL_CHAIN = [
  "gemini-3.1-flash-lite",  // Stable, 500 RPD (best daily quota)
  "gemini-3.5-flash",       // Higher quality, 20 RPD
  "gemini-3-flash-preview"  // Backup, 20 RPD
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
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    descriptions: {
                      type: "ARRAY",
                      items: { type: "STRING" }
                    }
                  },
                  required: ["descriptions"]
                }
              }
            }),
          }
        );

        if (response.ok) {
          return response;
        }

        // Handle rate limits (429) and server overload (503) with exponential backoff
        if (response.status === 429 || response.status === 503) {
          lastError = await response.text();
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.warn(`Model ${model} returned ${response.status}. Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For other errors (e.g., 404), move to the next model immediately
          lastError = await response.text();
          break;
        }
      } catch (error) {
        lastError = error.message;
        break;
      }
    }
  }
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
- Return a JSON object with exactly one key: "descriptions". The value must be an array containing exactly three strings.

PAGE CONTENT:
"""${content.slice(0, 3000)}"""
`;

  try {
    const geminiResponse = await callGeminiWithFallback(prompt, apiKey);
    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let descriptions = [];
    try {
      const parsedData = JSON.parse(rawText);
      descriptions = parsedData.descriptions || [];
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", rawText);
      return res.status(502).json({ error: "AI returned malformed data. Please try again." });
    }

    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(502).json({ error: "AI failed to generate descriptions. Please try again." });
    }

    return res.status(200).json({ descriptions: descriptions.slice(0, 3) });

  } catch (error) {
    console.error("Final Server Error:", error.message);
    return res.status(500).json({ error: "All AI models are currently busy. Please try again in a minute." });
  }
};
