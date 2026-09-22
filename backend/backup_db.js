const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function backupDatabase() {
  console.log('Starting full database backup...');
  try {
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const backupData = {};
    for (const row of tablesRes.rows) {
      const table = row.table_name;
      const res = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = res.rows;
      console.log(`Backed up table: ${table} (${res.rows.length} rows)`);
    }

    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `tasky_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    console.log(`\nSUCCESS: Full database backup saved to: ${filepath}`);

  } catch (err) {
    console.error('Error during backup:', err);
  } finally {
    await pool.end();
  }
}

backupDatabase();
