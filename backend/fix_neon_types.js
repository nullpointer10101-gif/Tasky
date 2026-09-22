const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const neonUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function fixTypes() {
  console.log('=== CONNECTING TO NEON TO FIX COLUMN TYPES ===');
  const client = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const backupDir = path.join(__dirname, 'backups');
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  const backupPath = path.join(backupDir, files[0]);
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  for (const [table, rows] of Object.entries(backupData)) {
    if (!rows || rows.length === 0) continue;

    console.log(`\nFixing types for table: ${table}`);
    const sample = rows[0];

    for (const [col, val] of Object.entries(sample)) {
      if (col === 'id') continue; // already BIGINT

      // Check non-null values across rows to infer type
      let inferredType = null;
      for (const row of rows.slice(0, 100)) {
        const v = row[col];
        if (v === null || v === undefined) continue;

        if (typeof v === 'boolean') {
          inferredType = 'BOOLEAN';
          break;
        } else if (typeof v === 'number') {
          inferredType = Number.isInteger(v) ? 'BIGINT' : 'NUMERIC';
          break;
        } else if (typeof v === 'string') {
          // Check if ISO timestamp string
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            inferredType = 'TIMESTAMPTZ';
            break;
          }
        }
      }

      if (inferredType) {
        try {
          let usingExpr = `"${col}"::${inferredType.toLowerCase()}`;
          if (inferredType === 'BOOLEAN') {
            usingExpr = `CASE WHEN LOWER("${col}") = 'true' THEN true WHEN LOWER("${col}") = 'false' THEN false ELSE NULL END`;
          }

          const sql = `ALTER TABLE "${table}" ALTER COLUMN "${col}" TYPE ${inferredType} USING (${usingExpr})`;
          await client.query(sql);
          console.log(`  ✓ ${col} -> ${inferredType}`);
        } catch (err) {
          console.error(`  ❌ Failed to alter ${table}.${col} to ${inferredType}: ${err.message}`);
        }
      }
    }
  }

  await client.end();
  console.log('\n🎉 ALL COLUMN TYPES FIXED ON NEON!');
}

fixTypes().catch(err => {
  console.error('Fatal error fixing types:', err);
  process.exit(1);
});
