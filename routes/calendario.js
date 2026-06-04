const express = require('express');
const router = express.Router();
const pool = require('../db');

// Pedidos aprobados para el calendario (todos los roles pueden verlo)
router.get('/', async (req, res) => {
  const { desde, hasta, gerente_id, empresa_id } = req.query;
  try {
    let where = `p.estado = 'aprobado'`;
    const params = [];
    if (desde && hasta) {
      params.push(desde, hasta);
      where += ` AND NOT (p.fecha_fin < $${params.length-1} OR p.fecha_inicio > $${params.length})`;
    }
    if (gerente_id) { params.push(gerente_id); where += ` AND p.gerente_id = $${params.length}`; }
    if (empresa_id) { params.push(empresa_id); where += ` AND p.empresa_id = $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT p.id, p.empleado_nombre, p.fecha_inicio, p.fecha_fin, p.dias_habiles,
             p.reemplazante, e.nombre as empresa_nombre, e.color as empresa_color,
             g.nombre as gerente_nombre
      FROM pedidos p
      JOIN empresas e ON p.empresa_id = e.id
      JOIN gerentes g ON p.gerente_id = g.id
      WHERE ${where}
      ORDER BY p.fecha_inicio
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener calendario' });
  }
});

module.exports = router;
