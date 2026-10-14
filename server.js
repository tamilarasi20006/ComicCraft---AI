const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post(['/generate', '/api/generate'], async (req, res) => {
  try {
    const { story, style } = req.body;
    if (!story) return res.status(400).json({ error: "Story missing da!" });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY missing in Vercel!" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: `You are a comic writer. Create 4 panels story in ${style} style. Return JSON array: [{"panel":1,"text":"...","imagePrompt":"..."}]` },
          { role: "user", content: story }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "Groq error" });

    const content = data.choices[0].message.content;
    let comicData;
    try {
      const jsonMatch = content.match(/\[.*\]/s);
      comicData = JSON.parse(jsonMatch? jsonMatch[0] : content);
    } catch {
      comicData = [{ panel: 1, text: content, imagePrompt: story }];
    }
    res.json({ comic: comicData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on ${PORT}`));
}
