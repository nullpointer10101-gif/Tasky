const { Pool } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_8PCagGxpEdz9@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const neonPool = new Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });

async function inspectNeon() {
  console.log('--- Connecting to LIVE Neon Production Database ---');
  try {
    const tables = await neonPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Found ${tables.rows.length} tables in Neon.`);
    
    for (const r of tables.rows) {
      const c = await neonPool.query(`SELECT count(*) FROM "${r.table_name}"`);
      console.log(`  - ${r.table_name}: ${c.rows[0].count} rows`);
    }
    await neonPool.end();
  } catch (err) {
    console.error('Error connecting to Neon:', err);
  }
}

inspectNeon();
