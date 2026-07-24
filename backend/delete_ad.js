const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("DELETE FROM user_tasks WHERE task_id IN (SELECT id FROM tasks WHERE title = 'Watch an Ad')"))
  .then(() => client.query("DELETE FROM tasks WHERE title = 'Watch an Ad'"))
  .then(() => {
    console.log('Ad task removed completely');
    client.end();
  }).catch(err => {
    console.error(err);
    client.end();
  });
