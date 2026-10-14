module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { story, style } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY missing in Vercel Settings"
      });
    }

    if (!story || typeof story !== "string") {
      return res.status(400).json({
        error: "Please enter a story"
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: Bearer ${groqKey},
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                You are a comic creator. Create exactly 4 comic panels in ${style || "cartoon"} style. Return ONLY valid JSON in this format: {"panels":[{"title":"Panel 1","text":"...","imagePrompt":"..."},{"title":"Panel 2","text":"...","imagePrompt":"..."},{"title":"Panel 3","text":"...","imagePrompt":"..."},{"title":"Panel 4","text":"...","imagePrompt":"..."}]}.
            },
            {
              role: "user",
              content: story
            }
          ],
          temperature: 0.7,
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Error:", data);
      return res.status(502).json({
        error: data.error?.message || "Groq API error"
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "No content received from Groq"
      });
    }

    let panelsData;

    try {
      const cleaned = content
        .replace(/json/gi, "")
        .replace(//g, "")
        .trim();

      panelsData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);

      return res.status(502).json({
        error: "Groq returned invalid JSON. Please try again."
      });
    }

    if (!Array.isArray(panelsData.panels)) {
      return res.status(502).json({
        error: "Invalid comic format: panels must be an array"
      });
    }

    return res.status(200).json(panelsData);

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
};
