const pool = require('../db');
const { mailRecordatorio } = require('./mails');

const MAX_RECORDATORIOS = 4;
const DIAS_ENTRE_RECORDATORIOS = 3;

async function enviarRecordatorios() {
  try {
    const ahora = new Date();
    const limite = new Date(ahora);
    limite.setDate(limite.getDate() - DIAS_ENTRE_RECORDATORIOS);

    const { rows } = await pool.query(`
      SELECT p.*, g.nombre as gerente_nombre, g.email as gerente_email
      FROM pedidos p
      JOIN gerentes g ON p.gerente_id = g.id
      WHERE p.estado = 'pendiente'
        AND p.recordatorios_enviados < $1
        AND (p.ultimo_recordatorio IS NULL OR p.ultimo_recordatorio < $2)
        AND p.created_at < $2
    `, [MAX_RECORDATORIOS, limite]);

    for (const pedido of rows) {
      try {
        await mailRecordatorio({
          gerente: { nombre: pedido.gerente_nombre, email: pedido.gerente_email },
          pedido,
          token: pedido.token_aprobacion
        });
        await pool.query(`
          UPDATE pedidos SET
            ultimo_recordatorio = NOW(),
            recordatorios_enviados = recordatorios_enviados + 1
          WHERE id = $1
        `, [pedido.id]);
        console.log(`[recordatorio] Enviado a ${pedido.gerente_email} para pedido #${pedido.id}`);
      } catch (e) {
        console.error(`[recordatorio] Error en pedido #${pedido.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[recordatorio] Error general:', e.message);
  }
}

module.exports = { enviarRecordatorios };
