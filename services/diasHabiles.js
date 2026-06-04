const pool = require('../db');

// Días hábiles = excluye domingos y feriados. Sábados cuentan.
async function calcularDiasHabiles(fechaInicio, fechaFin) {
  const feriados = await pool.query('SELECT fecha FROM feriados');
  const feriadoSet = new Set(feriados.rows.map(r => r.fecha.toISOString().split('T')[0]));

  let dias = 0;
  const current = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  while (current <= fin) {
    const dow = current.getDay(); // 0=domingo, 6=sábado
    const fechaStr = current.toISOString().split('T')[0];
    if (dow !== 0 && !feriadoSet.has(fechaStr)) {
      dias++;
    }
    current.setDate(current.getDate() + 1);
  }
  return dias;
}

module.exports = { calcularDiasHabiles };
