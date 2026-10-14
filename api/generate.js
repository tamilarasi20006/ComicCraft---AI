module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: "Method not allowed" });
  try {
    const { story, style } = req.body;
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY missing in Vercel Settings!" });
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: `Create 4 panels story in ${style} style. Return JSON array: [{"panel":1,"text":"..."}]` },
          { role: "user", content: story }
        ],
        temperature: 0.8
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq error");
    const content = data.choices[0].message.content;
    let comicData;
    try {
      const m = content.match(/\[.*\]/s);
      comicData = JSON.parse(m? m[0] : content);
    } catch {
      comicData = [{ panel: 1, text: content }];
    }
    res.json({ comic: comicData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
