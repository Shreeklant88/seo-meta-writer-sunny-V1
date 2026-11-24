module.exports = async function handler(req, res) {
  // Allow CORS for the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content } = req.body;

  if (!content || content.trim().length < 50) {
    return res.status(400).json({ error: "Content is too short." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured in Vercel." });
  }

  const prompt = `
You are an expert SEO copywriter.

Write exactly three meta descriptions for the following page content.
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
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini error:", errorBody);
      return res.status(502).json({ error: "AI service failed. Check Vercel logs." });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const descriptions = rawText
      .split("\n")
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((line) => line.length >= 100 && line.length <= 200)
      .slice(0, 3);

    if (descriptions.length === 0) {
      return res.status(502).json({ error: "AI returned an unusable response." });
    }

    return res.status(200).json({ descriptions });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
