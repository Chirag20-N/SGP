const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

router.get('/:city', async (req, res) => {
    try {
        const { city } = req.params;
        // 1. Current Weather
        const weatherRes = await axios.get(`${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`);
        const { lat, lon } = weatherRes.data.coord;
        
        // 2. Forecast (5 day / 3 hour)
        const forecastRes = await axios.get(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        
        // 3. Air Quality
        const aqiRes = await axios.get(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);

        res.json({
            current: weatherRes.data,
            forecast: forecastRes.data,
            aqi: aqiRes.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

module.exports = router; 