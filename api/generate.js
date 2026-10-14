module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method!== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { story, style } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({ error: "GROQ_API_KEY missing in Vercel Settings" });
    }

    if (!story || typeof story!== "string") {
      return res.status(400).json({ error: "Story is required" });
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You create comics. Return ONLY JSON array like [{"title":"Panel 1","description":"scene","dialogue":"hi"}]. 4 panels. Style: ${style || 'cartoon'}`
          },
          {
            role: "user",
            content: `Story: ${story}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return res.status(500).json({ error: data.error?.message || "Groq API failed" });
    }

    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json|```/g, "").trim();

    let panels;
    try {
      panels = JSON.parse(content);
    } catch {
      panels = content.split("\n").filter(l => l.trim()).slice(0,4).map((line, i) => ({
        title: `Panel ${i+1}`,
        description: line,
        dialogue: line
      }));
    }

    if (!Array.isArray(panels)) panels = [panels];

    return res.status(200).json({ panels });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
