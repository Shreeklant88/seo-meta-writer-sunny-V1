module.exports = async function handler(req, res) {
  // CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { content } = req.body;

  // Input validation
  if (!content || content.trim().length < 20) {
    return res.status(400).json({ error: "Please paste at least 20 characters of content." });
  }

  // Check for the API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured in Vercel." });

  // The prompt
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
    // --- CRITICAL FIX: Correct Model and v1beta Endpoint ---
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    // If Google returns an error, send the EXACT error back to the frontend
    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Error:", errorBody);
      return res.status(502).json({ error: `Gemini API Error: ${errorBody}` });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the descriptions
    const descriptions = rawText
      .split("\n")
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line) => line.length >= 100 && line.length <= 200)
      .slice(0, 3);

    if (descriptions.length === 0) {
      return res.status(502).json({ error: "AI returned an unusable response. Please try different content." });
    }

    // Success
    return res.status(200).json({ descriptions });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error. Check Vercel logs." });
  }
};
