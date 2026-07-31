const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function refundUser() {
    const telegramId = '5487109053';
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Check swaps table
        const swapsRes = await client.query(
            "SELECT * FROM swaps WHERE telegram_id = $1 AND status = 'pending'",
            [telegramId]
        );
        
        let found = false;
        
        if (swapsRes.rows.length > 0) {
            console.log('Found pending swap:', swapsRes.rows[0]);
            for (const swap of swapsRes.rows) {
                const refundAmount = parseFloat(swap.tasky_amount);
                console.log(`Refunding ${refundAmount} TASKY for swap ID ${swap.id}`);
                
                await client.query(
                    "UPDATE swaps SET status = 'rejected', rejection_reason = 'Silently refunded', processed_at = NOW() WHERE id = $1",
                    [swap.id]
                );
                
                await client.query(
                    "UPDATE users SET balance = balance + $1 WHERE telegram_id = $2",
                    [refundAmount, telegramId]
                );
            }
            found = true;
        }
        
        // Check withdrawals table
        const withRes = await client.query(
            "SELECT * FROM withdrawals WHERE telegram_id = $1 AND status = 'pending'",
            [telegramId]
        );
        
        if (withRes.rows.length > 0) {
            console.log('Found pending withdrawal:', withRes.rows[0]);
            for (const w of withRes.rows) {
                const refundAmount = parseFloat(w.tasky_amount);
                console.log(`Refunding ${refundAmount} TASKY for withdrawal ID ${w.id}`);
                
                await client.query(
                    "UPDATE withdrawals SET status = 'rejected', rejection_reason = 'Silently refunded', processed_at = NOW() WHERE id = $1",
                    [w.id]
                );
                
                await client.query(
                    "UPDATE users SET balance = balance + $1 WHERE telegram_id = $2",
                    [refundAmount, telegramId]
                );
            }
            found = true;
        }
        
        if (!found) {
            console.log('No pending swaps or withdrawals found for this user.');
        } else {
            console.log('Refund complete. Transaction committed.');
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error during refund:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

refundUser();
