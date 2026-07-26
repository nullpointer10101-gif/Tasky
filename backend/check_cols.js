require('dotenv').config();
const { pool } = require('./db.js');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%ad%'").then(res => {
    console.log(res.rows.map(r => r.column_name));
    process.exit(0);
});
