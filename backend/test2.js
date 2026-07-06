const { pool } = require('./db');
async function test() {
  try {
    const telegram_id = '123456';
    const { rows: users } = await pool.query('SELECT balance FROM users WHERE telegram_id = $1', [telegram_id]);
    const balance = users.length > 0 ? parseFloat(users[0].balance) : 0;
    
    const { rows: machines } = await pool.query('SELECT * FROM machines ORDER BY sort_order ASC');
    const { rows: userMachines } = await pool.query('SELECT machine_id, reveal_seen FROM user_machines WHERE telegram_id = $1', [telegram_id]);
    
    console.log('Balance:', balance);
    console.log('Machines count:', machines.length);
    console.log('User machines count:', userMachines.length);
    console.log('User machines:', userMachines);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
