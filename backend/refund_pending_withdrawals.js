const { pool } = require('./db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Add column
        console.log('Adding withdrawal_ads_watched column...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_ads_watched INT DEFAULT 0');
        
        // Get pending withdrawals
        const { rows } = await client.query("SELECT * FROM withdrawals WHERE status = 'pending'");
        console.log(`Found ${rows.length} pending withdrawals to refund.`);
        
        for (const w of rows) {
            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2',
                [w.tasky_amount, w.telegram_id]
            );
            await client.query(
                "UPDATE withdrawals SET status = 'rejected', processed_at = NOW(), rejection_reason = 'Refunded by system' WHERE id = $1",
                [w.id]
            );
            console.log(`Refunded ${w.tasky_amount} TASKY to ${w.telegram_id}`);
        }
        
        await client.query('COMMIT');
        console.log('Done!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
