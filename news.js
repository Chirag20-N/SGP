const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${city} AND (weather OR climate OR environment)&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`);
        res.json(response.data.articles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

module.exports = router; 