const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/', (req, res) => {
    res.json({ message: "Team Collaboration Workspace Server is running smoothly!" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is floating cleanly on port ${PORT}`);
});