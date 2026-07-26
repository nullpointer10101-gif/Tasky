require('dotenv').config();
const { pool } = require('./db.js');
pool.query(`SELECT COUNT(*) as total_ads, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as ads_today, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as ads_yesterday FROM ad_views`).then(res => { console.log(res.rows); process.exit(0); }).catch(console.error);
