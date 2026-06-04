const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Todas las rutas de admin requieren login + ser admin
router.use(authMiddleware, adminMiddleware);

// Listado completo de pedidos con filtros
router.get('/pedidos', async (req, res) => {
  const { estado, empresa_id, gerente_id, desde, hasta } = req.query;
  let where = '1=1'; const params = [];
  if (estado) { params.push(estado); where += ` AND p.estado=$${params.length}`; }
  if (empresa_id) { params.push(empresa_id); where += ` AND p.empresa_id=$${params.length}`; }
  if (gerente_id) { params.push(gerente_id); where += ` AND p.gerente_id=$${params.length}`; }
  if (desde) { params.push(desde); where += ` AND p.fecha_inicio>=$${params.length}`; }
  if (hasta) { params.push(hasta); where += ` AND p.fecha_fin<=$${params.length}`; }
  const { rows } = await pool.query(`
    SELECT p.*, e.nombre as empresa_nombre, e.color as empresa_color, g.nombre as gerente_nombre
    FROM pedidos p JOIN empresas e ON p.empresa_id=e.id JOIN gerentes g ON p.gerente_id=g.id
    WHERE ${where} ORDER BY p.created_at DESC
  `, params);
  res.json(rows);
});

// Feriados
router.get('/feriados', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM feriados ORDER BY fecha');
  res.json(rows);
});
router.post('/feriados', async (req, res) => {
  const { fecha, descripcion } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO feriados (fecha, descripcion) VALUES ($1,$2) ON CONFLICT (fecha) DO UPDATE SET descripcion=$2 RETURNING *',
    [fecha, descripcion]
  );
  res.json(rows[0]);
});
router.delete('/feriados/:id', async (req, res) => {
  await pool.query('DELETE FROM feriados WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Empresas
router.get('/empresas', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM empresas ORDER BY nombre');
  res.json(rows);
});

// Gerentes
router.get('/gerentes', async (req, res) => {
  const { rows } = await pool.query('SELECT id, nombre, email, es_admin, puede_ver_ids FROM gerentes ORDER BY nombre');
  res.json(rows);
});
router.post('/gerentes/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE gerentes SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
