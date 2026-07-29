require('dotenv').config({ path: '../backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function refund() {
    const telegram_ids = [
        '6309001416', '5179645662', '5738897062', '6250501966', '5487109053',
        '7160612503', '7501874780', '7029241412', '8761079373', '5884695161',
        '6306746612', '8162187957', '8725585109', '7983938173'
    ];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (let id of telegram_ids) {
            // Find pending swaps
            const res = await client.query("SELECT * FROM swaps WHERE telegram_id = $1 AND status = 'pending'", [id]);
            for (let swap of res.rows) {
                const amount = Number(swap.tasky_amount);
                console.log(`Refunding ${amount} TASKY for user ${id}`);
                
                // Refund balance
                await client.query('UPDATE users SET balance = balance + $1 WHERE telegram_id = $2', [amount, id]);
                
                // Delete swap so history is empty
                await client.query('DELETE FROM swaps WHERE id = $1', [swap.id]);
            }
            if (res.rows.length === 0) {
                console.log(`No pending swaps found for user ${id}`);
            }
        }

        await client.query('COMMIT');
        console.log('Refund complete!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

refund();
