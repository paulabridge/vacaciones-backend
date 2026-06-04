const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const { calcularDiasHabiles } = require('../services/diasHabiles');
const { mailNuevoPedidoGerente, mailConfirmacionEmpleado, mailResolucionEmpleado } = require('../services/mails');
const { authMiddleware } = require('../middleware/auth');

// Crear pedido (sin login)
router.post('/', async (req, res) => {
  const { empleado_nombre, empleado_email, empresa_id, gerente_id, fecha_inicio, fecha_fin, comentario_empleado } = req.body;
  if (!empleado_nombre || !empleado_email || !empresa_id || !gerente_id || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (new Date(fecha_fin) < new Date(fecha_inicio)) {
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });
  }

  try {
    // Verificar superposición para el mismo empleado
    const sup = await pool.query(`
      SELECT id FROM pedidos
      WHERE empleado_email = $1
        AND estado IN ('pendiente','aprobado')
        AND NOT (fecha_fin < $2 OR fecha_inicio > $3)
    `, [empleado_email, fecha_inicio, fecha_fin]);
    if (sup.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tenés un pedido activo que se superpone con esas fechas' });
    }

    // Advertencia superposición mismo gerente
    const supGerente = await pool.query(`
      SELECT COUNT(*) as cnt FROM pedidos
      WHERE gerente_id = $1 AND estado = 'aprobado'
        AND NOT (fecha_fin < $2 OR fecha_inicio > $3)
    `, [gerente_id, fecha_inicio, fecha_fin]);

    const dias_habiles = await calcularDiasHabiles(fecha_inicio, fecha_fin);
    const token = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(`
      INSERT INTO pedidos (empleado_nombre, empleado_email, empresa_id, gerente_id, fecha_inicio, fecha_fin, dias_habiles, comentario_empleado, token_aprobacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [empleado_nombre, empleado_email, empresa_id, gerente_id, fecha_inicio, fecha_fin, dias_habiles, comentario_empleado || null, token]);

    const pedido = rows[0];

    // Enrich con empresa y gerente
    const empresa = await pool.query('SELECT nombre FROM empresas WHERE id=$1', [empresa_id]);
    const gerente = await pool.query('SELECT nombre, email FROM gerentes WHERE id=$1', [gerente_id]);

    pedido.empresa_nombre = empresa.rows[0]?.nombre;
    const ger = gerente.rows[0];

    // Enviar mails (no bloqueante)
    mailNuevoPedidoGerente({ gerente: ger, pedido, token }).catch(console.error);
    mailConfirmacionEmpleado({ pedido }).catch(console.error);

    res.json({
      ok: true,
      id: pedido.id,
      dias_habiles,
      advertencia_superposicion: parseInt(supGerente.rows[0].cnt) > 0
        ? 'Hay otras personas de tu equipo aprobadas en esas fechas. El gerente lo verá al revisar tu pedido.'
        : null
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar el pedido' });
  }
});

// Ver pedidos del gerente logueado
router.get('/mis-pedidos', authMiddleware, async (req, res) => {
  const { id, es_admin, puede_ver_ids } = req.gerente;
  try {
    let query, params;
    if (es_admin) {
      query = `SELECT p.*, e.nombre as empresa_nombre, e.color as empresa_color, g.nombre as gerente_nombre
               FROM pedidos p JOIN empresas e ON p.empresa_id=e.id JOIN gerentes g ON p.gerente_id=g.id
               ORDER BY p.created_at DESC`;
      params = [];
    } else {
      const ids = [id, ...(puede_ver_ids || [])];
      query = `SELECT p.*, e.nombre as empresa_nombre, e.color as empresa_color, g.nombre as gerente_nombre
               FROM pedidos p JOIN empresas e ON p.empresa_id=e.id JOIN gerentes g ON p.gerente_id=g.id
               WHERE p.gerente_id = ANY($1)
               ORDER BY p.created_at DESC`;
      params = [ids];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Ver pedido por token (para link del mail)
router.get('/token/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, e.nombre as empresa_nombre, g.nombre as gerente_nombre
      FROM pedidos p JOIN empresas e ON p.empresa_id=e.id JOIN gerentes g ON p.gerente_id=g.id
      WHERE p.token_aprobacion = $1
    `, [req.params.token]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// Resolver pedido (por token o autenticado)
router.post('/:id/resolver', async (req, res) => {
  const { estado, reemplazante, comentario_gerente, token } = req.body;
  const { id } = req.params;
  if (!['aprobado','rechazado','a_revisar'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  try {
    // Verificar acceso: token o auth header
    let autorizado = false;
    let gerente_resolver_id = null;
    if (token) {
      const { rows } = await pool.query('SELECT id, gerente_id FROM pedidos WHERE id=$1 AND token_aprobacion=$2', [id, token]);
      if (rows.length) { autorizado = true; gerente_resolver_id = rows[0].gerente_id; }
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
          autorizado = true;
          gerente_resolver_id = decoded.id;
        } catch {}
      }
    }
    if (!autorizado) return res.status(401).json({ error: 'No autorizado' });

    const { rows } = await pool.query(`
      UPDATE pedidos SET estado=$1, reemplazante=$2, comentario_gerente=$3,
        resuelto_por=$4, resuelto_at=NOW()
      WHERE id=$5 RETURNING *
    `, [estado, reemplazante || null, comentario_gerente || null, gerente_resolver_id, id]);

    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const pedido = rows[0];
    mailResolucionEmpleado({ pedido, estado }).catch(console.error);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al resolver' });
  }
});

module.exports = router;
