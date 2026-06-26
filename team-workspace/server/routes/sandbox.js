const axios = require('axios');
const express = require('express');
const router = express.Router();

const JUDGE0_BASE = "https://ce.judge0.com";

router.post('/run', async (req, res) => {
  const { code, language } = req.body;
  const languageId = language === 'javascript' ? 93 : 92;

  try {
    // 1. Submit Code
    const response = await axios.post(`${JUDGE0_BASE}/submissions?base64_encoded=true&wait=true`, {
      language_id: languageId,
      source_code: Buffer.from(code).toString('base64'),
      stdin: Buffer.from("").toString('base64'),
    });

    // 2. Return result (wait=true handles the polling for you automatically)
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Judge0 Proxy Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to execute code on sandbox." });
  }
});

module.exports = router;