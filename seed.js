// seed.js — correr una sola vez para crear los gerentes iniciales
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

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

async function seed() {
  try {
    for (const g of gerentes) {
      const hash = await bcrypt.hash(g.password, 10);
      await pool.query(
        `INSERT INTO gerentes (nombre, email, password_hash, es_admin)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3, es_admin = $4`,
        [g.nombre, g.email, hash, g.es_admin]
      );
      console.log(`✓ ${g.nombre}`);
    }

    // Mauro puede ver a Nancy, Jonatan y Belén
    const mauro = await pool.query(`SELECT id FROM gerentes WHERE email = 'mauro.vagliente@bridgetdf.com'`);
    const subordinados = await pool.query(
      `SELECT id FROM gerentes WHERE email = ANY($1)`,
      [['nancy.bender@bridgetdf.com', 'jonatan.picardi@comercialdelsurtdf.com', 'belen.moreno@turenne.com.ar']]
    );
    const ids = subordinados.rows.map(r => r.id);
    await pool.query(`UPDATE gerentes SET puede_ver_ids = $1 WHERE id = $2`, [ids, mauro.rows[0].id]);
    console.log(`✓ Permisos de Mauro configurados`);

    console.log('\n✅ Seed completado');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
