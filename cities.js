const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Saved Cities
router.get('/saved', (req, res) => {
    db.all("SELECT * FROM saved_cities", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/saved', (req, res) => {
    const { name } = req.body;
    db.run("INSERT OR IGNORE INTO saved_cities (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

router.delete('/saved/:name', (req, res) => {
    db.run("DELETE FROM saved_cities WHERE name = ?", [req.params.name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: req.params.name });
    });
});

// Recent Searches
router.get('/recent', (req, res) => {
    db.all("SELECT DISTINCT name FROM recent_searches ORDER BY timestamp DESC LIMIT 5", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/recent', (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO recent_searches (name) VALUES (?)", [name], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.sendStatus(200);
    });
});

module.exports = router;