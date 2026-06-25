const express = require('express');
const router = express.Router();

// This handles: POST http://localhost:5000/api/sandbox/run
router.post('/run', async (req, res) => {
  const { code, language } = req.body;
  const languageId = language === 'javascript' ? 93 : 92;

  try {
    const response = await fetch("https://judge0-ce.p.sulu.sh/submissions?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: ""
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Sandbox Internal Error:", error);
    return res.status(500).json({ 
      error: "The server proxy engine failed to contact the sandbox.", 
      details: error.message 
    });
  }
});

// CRITICAL: Express will fail to load the route if this line is missing
module.exports = router;