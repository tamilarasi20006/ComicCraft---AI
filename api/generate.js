module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
    const { story, style } = req.body;
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({ error: "GROQ_API_KEY missing in Vercel Settings" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a comic creator. Create a 4 panel comic story in ${style} style. Return ONLY valid JSON like this: {"panels": [{"title": "Panel 1", "text": "story text", "imagePrompt": "detailed prompt for image"}]} No extra text.`
          },
          { role: "user", content: story }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Error:", data);
      return res.status(500).json({ error: data.error?.message || "Groq API error", details: data });
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No content from Groq" });
    }

    // Try to parse JSON from content
    let panelsData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      panelsData = JSON.parse(jsonMatch? jsonMatch[0] : content);
    } catch (e) {
      panelsData = { panels: [{ title: "Story", text: content, imagePrompt: story }] };
    }

    return res.status(200).json(panelsData);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
