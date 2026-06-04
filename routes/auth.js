const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM gerentes WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const gerente = rows[0];
    const ok = await bcrypt.compare(password, gerente.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    const token = jwt.sign(
      { id: gerente.id, nombre: gerente.nombre, email: gerente.email, es_admin: gerente.es_admin, puede_ver_ids: gerente.puede_ver_ids },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, gerente: { id: gerente.id, nombre: gerente.nombre, email: gerente.email, es_admin: gerente.es_admin } });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/cambiar-password', async (req, res) => {
  const { email, password_actual, password_nuevo } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM gerentes WHERE email = $1', [email]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 10);
    await pool.query('UPDATE gerentes SET password_hash = $1 WHERE email = $2', [hash, email]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
