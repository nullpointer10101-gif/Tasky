const { pool } = require('./db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find swap 32
        const swapRes = await client.query("SELECT * FROM swaps WHERE id = 32 AND status = 'pending' FOR UPDATE");
        if (swapRes.rows.length === 0) {
            console.log("Swap 32 not found or not pending.");
            await client.query('ROLLBACK');
            return;
        }
        
        const swap = swapRes.rows[0];
        
        // Reject swap
        await client.query("UPDATE swaps SET status = 'rejected', rejection_reason = 'Silently refunded', processed_at = NOW() WHERE id = 32");
        
        // Refund balance
        await client.query("UPDATE users SET balance = balance + $1 WHERE telegram_id = $2", [swap.tasky_amount, swap.telegram_id]);
        
        await client.query('COMMIT');
        console.log(`Swap 32 rejected and ${swap.tasky_amount} TASKY refunded to ${swap.telegram_id} silently.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
run();
