require('dotenv').config();
const {pool} = require('./db');
pool.query("SELECT telegram_id, username FROM users WHERE username ILIKE '%taskycs%' OR username ILIKE '%tasky_cs%'")
    .then(r => console.log(r.rows))
    .catch(console.error)
    .finally(()=>process.exit());
