const { pool } = require('./db');
async function test() {
  try {
    const telegram_id = '123456';
    const { rows: users } = await pool.query(`
      SELECT u.id, u.mining_level, u.efficiency_percent, u.balance,
             u.holding_stable_since, u.wallet_address, ml.name as level_name, ml.base_speed_per_hour
      FROM users u
      LEFT JOIN mining_levels ml ON u.mining_level = ml.level
      WHERE u.telegram_id = $1
    `, [telegram_id]);
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
