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
  
  // 1. Map to Piston API standard language requirements
  const pistonLang = language === 'javascript' ? 'javascript' : 'python';
  const pistonVersion = language === 'javascript' ? '18.15.0' : '3.10.0';

  try {
    // 2. Hit the highly stable Piston code execution engine
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLang,
        version: pistonVersion,
        files: [{ content: code }]
      })
    });

    if (!response.ok) {
      throw new Error(`Piston API returned status ${response.status}`);
    }

    const result = await response.json();

    // 3. THE MAGIC: Map Piston's response back to Judge0's JSON schema
    // This prevents you from having to rewrite your React frontend logic!
    const mappedData = {
      stdout: result.run?.stdout || "",
      stderr: result.run?.stderr || "",
      compile_output: result.compile?.stderr || "",
      status: {
        description: result.run?.code === 0 ? "Success" : "Runtime Error"
      }
    };

    return res.status(200).json(mappedData);
    
  } catch (error) {
    console.error("Sandbox Proxy Engine Failure:", error);
    return res.status(500).json({ 
      error: "The server proxy engine failed to contact the code sandbox.", 
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