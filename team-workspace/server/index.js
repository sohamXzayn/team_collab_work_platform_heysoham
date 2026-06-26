const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Added axios here
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- BULLETPROOF SANDBOX PROXY ROUTE (Using Judge0) ---
app.post('/api/sandbox/run', async (req, res) => {
  const { code, language } = req.body;
  
  // Map standard languages to Judge0 CE IDs
  const languageId = language === 'javascript' ? 93 : 92;

  try {
    const response = await axios.post(`https://ce.judge0.com/submissions?base64_encoded=true&wait=true`, {
      language_id: languageId,
      source_code: Buffer.from(code).toString('base64'),
      stdin: Buffer.from("").toString('base64'),
    });

    // Return the successful Judge0 payload directly to React
    return res.status(200).json(response.data);
    
  } catch (error) {
    console.error("Judge0 Proxy Error:", error.response?.data || error.message);
    return res.status(500).json({ 
      error: "The server proxy engine failed to contact the code sandbox.", 
      details: error.message 
    });
  }
});
// --------------------------------------------------------------------------

app.get('/', (req, res) => {
    res.json({ message: "Team Collaboration Workspace Server is running smoothly!" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is floating cleanly on port ${PORT}`);
});