// routes/gerentes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, nombre FROM gerentes ORDER BY nombre');
  res.json(rows);
});

module.exports = router;
