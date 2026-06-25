const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Essential: Must be above routes to parse incoming JSON bodies

// --- BULLETPROOF SANDBOX PROXY ROUTE (Inline to avoid file import issues) ---
app.post('/api/sandbox/run', async (req, res) => {
  const { code, language } = req.body;
  const languageId = language === 'javascript' ? 93 : 92;

  try {
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

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Sandbox Proxy Failure:", error);
    return res.status(500).json({ 
      error: "The server proxy engine failed to contact the sandbox sandbox.", 
      details: error.message 
    });
  }
});
// --------------------------------------------------------------------------

// Health Check Route
app.get('/', (req, res) => {
    res.json({ message: "Team Collaboration Workspace Server is running smoothly!" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is floating cleanly on port ${PORT}`);
});