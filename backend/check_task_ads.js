require('dotenv').config();
const { pool } = require('./db.js');
pool.query("SELECT COUNT(*) FROM user_tasks ut JOIN tasks t ON ut.task_id = t.id WHERE t.verification_type = 'auto_ad' AND ut.status = 'approved'").then(res => {
    console.log(res.rows);
    process.exit(0);
});
