require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/generate', async (req, res) => {
  try {
    const story = req.body.story || req.body.storyIdea || "";
    const style = req.body.style || "cartoon";
    if (!story) return res.json({ panels: ["Type a story da!", "Panel 2", "Panel 3", "Panel 4"] });

    console.log("Story:", story);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: 'You are a comic writer. Return ONLY JSON: {"panels": ["1","2","3","4"]}' },
        { role: "user", content: `Story: ${story}` }
      ]
    });

    let text = completion.choices[0].message.content;
    console.log(text);
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return res.json(JSON.parse(m[0]));
    return res.json({ panels: text.split("\n").slice(0,4) });

  } catch (e) {
    console.log("Error:", e.message);
    return res.json({ 
      panels: [
        `${req.body.story} - Hero starts adventure!`,
        `Big villain comes to city!`,
        `Hero fights with super power!`,
        `Hero saves everyone! Happy Ending!`
      ]
    });
  }
});

app.listen(5000, () => console.log('ComicCraft running at http://localhost:5000 - NO ERROR!'));