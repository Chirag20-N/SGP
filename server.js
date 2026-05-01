require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/weather', require('./routes/weather'));
app.use('/api/news', require('./routes/news'));
app.use('/api/cities', require('./routes/cities'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});