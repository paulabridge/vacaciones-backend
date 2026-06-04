const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
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
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
