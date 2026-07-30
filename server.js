const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors({ 
  origin: [
    'https://vacaciones.bridgetdf.com',
    'https://vacaciones-bridge.netlify.app',
    process.env.FRONTEND_URL
  ].filter(Boolean)
}));
app.use(express.json());

const authRoutes = require('./routes/auth');
const pedidosRoutes = require('./routes/pedidos');
const gerentesRoutes = require('./routes/gerentes');
const calendarioRoutes = require('./routes/calendario');
const adminRoutes = require('./routes/admin');
const { enviarRecordatorios } = require('./services/recordatorios');

app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/gerentes', gerentesRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Cron: cada día a las 9am Argentina revisa pedidos sin resolver
cron.schedule('0 12 * * *', () => {
  console.log('[cron] Verificando recordatorios...');
  enviarRecordatorios();
}, { timezone: 'America/Argentina/Buenos_Aires' });

const PORT = process.env.PORT || 3001;
app.get('/api/run-seed', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const pool = require('./db');
    const gerentes = [
      { nombre: 'Mauro', email: 'mauro.vagliente@bridgetdf.com', password: 'Mauro2026!', es_admin: false },
      { nombre: 'Nancy', email: 'nancy.bender@bridgetdf.com', password: 'Nancy2026!', es_admin: false },
      { nombre: 'Jonatan', email: 'jonatan.picardi@comercialdelsurtdf.com', password: 'Jonatan2026!', es_admin: false },
      { nombre: 'Belén', email: 'belen.moreno@turenne.com.ar', password: 'Belen2026!', es_admin: false },
      { nombre: 'Paula', email: 'paula@bridgetdf.com', password: 'Paula2026!', es_admin: true },
      { nombre: 'Carolina', email: 'carolina.cruz@bridgetdf.com', password: 'Carolina2026!', es_admin: false },
      { nombre: 'Marcelo', email: 'marcelo.beatrice@bridgetdf.com', password: 'Marcelo2026!', es_admin: false },
      { nombre: 'Diego', email: 'diego.greco@comercialdelsurtdf.com', password: 'Diego2026!', es_admin: false },
    ];
    for (const g of gerentes) {
      const hash = await bcrypt.hash(g.password, 10);
      await pool.query(
        `INSERT INTO gerentes (nombre, email, password_hash, es_admin) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO UPDATE SET password_hash=$3, es_admin=$4`,
        [g.nombre, g.email, hash, g.es_admin]
      );
    }
    const mauro = await pool.query(`SELECT id FROM gerentes WHERE email='mauro.vagliente@bridgetdf.com'`);
    const subs = await pool.query(`SELECT id FROM gerentes WHERE email = ANY($1)`, [['nancy.bender@bridgetdf.com','jonatan.picardi@comercialdelsurtdf.com','belen.moreno@turenne.com.ar']]);
    await pool.query(`UPDATE gerentes SET puede_ver_ids=$1 WHERE id=$2`, [subs.rows.map(r=>r.id), mauro.rows[0].id]);
    res.json({ ok: true, mensaje: 'Seed completado' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
