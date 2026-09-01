const bot = require('./bot');
const { pool } = require('./db');

async function test() {
  // Let's get the user who made the last claim or user ID
  const users = await pool.query('SELECT telegram_id, username, first_name FROM users ORDER BY created_at DESC LIMIT 5');
  console.log('Testing users:', users.rows);

  const channels = ['@Tasky_Official', '@TaskyPayouts', '@AlphaDropDaily', '@TaskyOfficialCommunity'];

  for (const u of users.rows) {
    console.log(`\n--- Checking User: ${u.first_name} (@${u.username}) ID: ${u.telegram_id} ---`);
    for (const ch of channels) {
      try {
        const member = await bot.getChatMember(ch, u.telegram_id);
        console.log(`  ${ch}: status = "${member.status}"`);
      } catch (err) {
        console.log(`  ${ch}: ERROR -> ${err.message}`);
      }
    }
  }

  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
