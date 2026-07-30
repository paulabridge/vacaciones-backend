const { Pool } = require('pg');
const dns = require('dns').promises;

let pool;

async function getPool() {
  if (pool) return pool;
  
  const url = new URL(process.env.DATABASE_URL);
  const hostname = url.hostname;
  
  // Resolver hostname a IPv4 explícitamente
  const addresses = await dns.resolve4(hostname);
  const ipv4 = addresses[0];
  
  const connectionString = process.env.DATABASE_URL.replace(hostname, ipv4);
  
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  return pool;
}

module.exports = { query: async (...args) => (await getPool()).query(...args) };
