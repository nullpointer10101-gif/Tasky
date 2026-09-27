const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres'
});

async function run() {
  try {
    const adminRows = await pool.query('SELECT * FROM admin_users');
    console.log('Admin users in DB:');
    console.table(adminRows.rows);

    // Test live login
    console.log('\nTesting live API https://hashbee.onrender.com/api/admin/login with meela/meela:');
    try {
      const res = await axios.post('https://hashbee.onrender.com/api/admin/login', {
        identifier: 'meela',
        password: 'meela'
      });
      console.log('Login result with identifier:', res.data);
    } catch (e) {
      console.log('Failed with identifier:', e.response?.data || e.message);
    }

    try {
      const res2 = await axios.post('https://hashbee.onrender.com/api/admin/login', {
        username: 'meela',
        password: 'meela'
      });
      console.log('Login result with username:', res2.data);
    } catch (e) {
      console.log('Failed with username:', e.response?.data || e.message);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
