require('dotenv').config();
const { pool } = require('./db.js');
pool.query(`
    SELECT 
        u.telegram_id, u.withdrawal_ads_watched,
        (SELECT COUNT(*) FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE ut.telegram_id = u.telegram_id AND t.verification_type = 'auto_ad' AND ut.status = 'approved') as task_ads_watched
    FROM users u
    ORDER BY u.withdrawal_ads_watched DESC
    LIMIT 5
`).then(res => {
    console.log(res.rows);
    process.exit(0);
});
