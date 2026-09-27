const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('--- Connecting to HashBee Supabase DB ---');
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', tables.rows.map(t => t.table_name));

    const users = await pool.query("SELECT * FROM users WHERE username ILIKE '%vinkey%' OR username ILIKE '%ba_noi%' OR username ILIKE '%giabao%' OR username ILIKE '%bon_bon%' OR username ILIKE '%longvip%'");
    console.log('Users in HashBee matching the screenshot:');
    console.table(users.rows.map(u => ({ id: u.id, tg: u.telegram_id, username: u.username, name: u.first_name, status: u.status, bp: u.bp })));

    const tournaments = await pool.query("SELECT * FROM campaign_tournaments ORDER BY id DESC LIMIT 5").catch(e => ({ rows: [] }));
    console.log('Tournaments in HashBee:');
    console.table(tournaments.rows);

    const topAds = await pool.query(`
      SELECT u.username, u.first_name, u.telegram_id, count(a.id) as cnt
      FROM ad_views a
      JOIN users u ON u.telegram_id::text = a.telegram_id::text
      GROUP BY u.username, u.first_name, u.telegram_id
      ORDER BY cnt DESC
      LIMIT 15
    `).catch(e => ({ rows: [] }));
    console.log('Top Ad Users in HashBee:');
    console.table(topAds.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();
