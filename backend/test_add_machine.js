const { pool } = require('./db');
async function run() {
  try {
    const m = {
      name: 'Test Engine',
      rarity: 'rare',
      min_holding: 1000,
      speed_bonus_percent: 15,
      icon_key: 'test_engine',
      reveal_at_holding: 500,
      sort_order: 10
    };
    await pool.query(`
        INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [m.name, m.rarity, m.min_holding, m.speed_bonus_percent, m.icon_key, m.reveal_at_holding, m.sort_order]);
    console.log('Inserted new machine');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
