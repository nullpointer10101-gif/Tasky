const { pool } = require('./db');
async function test() {
    try {
        await pool.query("UPDATE tasks SET reward_tasky = '50' WHERE action_url = 'https://x.com/i/status/2085080833069810047'");
        console.log('Reward updated to 50!');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
