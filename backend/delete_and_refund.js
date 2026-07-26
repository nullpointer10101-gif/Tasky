const { pool } = require('./db');

async function run() {
    const client = await pool.connect();
    const telegramId = '7983938173';
    
    try {
        await client.query('BEGIN');
        
        // Check withdrawals table
        const wRes = await client.query("SELECT * FROM withdrawals WHERE telegram_id = $1 AND status = 'pending'", [telegramId]);
        for (const w of wRes.rows) {
            console.log(`Refunding ${w.tasky_amount} from withdrawals...`);
            await client.query('UPDATE users SET balance = balance + $1 WHERE telegram_id = $2', [w.tasky_amount, telegramId]);
            await client.query('DELETE FROM withdrawals WHERE id = $1', [w.id]);
            console.log(`Deleted withdrawal ID ${w.id}`);
        }

        // Check swaps table
        const sRes = await client.query("SELECT * FROM swaps WHERE telegram_id = $1 AND status = 'pending'", [telegramId]);
        for (const s of sRes.rows) {
            console.log(`Refunding ${s.tasky_amount} from swaps...`);
            await client.query('UPDATE users SET balance = balance + $1 WHERE telegram_id = $2', [s.tasky_amount, telegramId]);
            await client.query('DELETE FROM swaps WHERE id = $1', [s.id]);
            console.log(`Deleted swap ID ${s.id}`);
        }

        await client.query('COMMIT');
        console.log('Done refunding and hiding requests.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
