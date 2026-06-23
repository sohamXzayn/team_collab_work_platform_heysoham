const express = require('express');
const router = express.Router();

// Route configuration handling remote secure runtime proxies
router.post('/run', async (req, res) => {
  const { code, language } = req.body;
  
  // Map incoming frontend strings to Judge0 official engine parameters
  // ID 93: JavaScript (Node.js 18.15.0), ID 92: Python (3.11.2)
  const languageId = language === 'javascript' ? 93 : 92;

  try {
    // 1. Forward data server-to-server (bypasses browser constraints completely)
    const response = await fetch("https://judge0-ce.p.sulu.sh/submissions?wait=true", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: ""
      })
    });

    // 2. Safely capture data payload layout out of runtime target
    const data = await response.json();
    
    // 3. Hand clean structural formatting back to user client interface
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Internal Engine Routing Error:", error);
    return res.status(500).json({ 
      error: "The server execution engine failed to parse code safely.", 
      details: error.message 
    });
  }
});

module.exports = router;