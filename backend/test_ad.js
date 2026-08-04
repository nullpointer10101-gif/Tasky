const {pool} = require('./db');
(async () => {
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users LIMIT 1');
        if(!userRes.rows.length) return console.log('no user');
        const u = userRes.rows[0];
        const tRes = await client.query("SELECT * FROM tasks WHERE verification_type='auto_ad' LIMIT 1");
        if(!tRes.rows.length) return console.log('no ad task');
        const t = tRes.rows[0];
        
        const res = await fetch('http://localhost:3000/api/tasks/complete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({telegram_id: u.telegram_id, task_id: t.id})
        });
        const text = await res.text();
        console.log('status:', res.status, 'response:', text);
    } catch(e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
})();
