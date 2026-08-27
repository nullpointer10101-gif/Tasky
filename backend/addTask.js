const { pool } = require('./db');
async function test() {
    try {
        await pool.query(`
            INSERT INTO tasks (title, subtitle, type, reward_tasky, action_url, is_active, is_featured, verification_type, icon, x_subtype, is_daily, category, admin_only) 
            VALUES (
                'Repost and Quote', 
                'Help spread the word by reposting and quoting our latest post on X!', 
                'twitter', 
                '100', 
                'https://x.com/i/status/2085080833069810047', 
                true, 
                true, 
                'proof_username', 
                'Twitter', 
                'repost', 
                false, 
                'internal', 
                false
            )
        `);
        console.log('Task inserted successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
