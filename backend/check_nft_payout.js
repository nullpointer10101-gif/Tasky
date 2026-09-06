require('dotenv').config();
const { pool } = require('./db.js');

async function checkNFTAndPayout() {
    const targetId = '7893196937';

    // 1. Check user_nft_cards
    const userNfts = await pool.query(`
        SELECT unc.*, nc.*
        FROM user_nft_cards unc
        JOIN nft_cards nc ON unc.nft_id = nc.id
        WHERE unc.telegram_id = $1
    `, [targetId]);
    console.log('--- User NFT Cards ---');
    console.log(`User owns ${userNfts.rows.length} NFT cards.`);
    if (userNfts.rows.length > 0) {
        console.table(userNfts.rows);
    }

    // 2. Check all available NFT cards in the system
    const allNfts = await pool.query(`SELECT * FROM nft_cards ORDER BY id ASC`);
    console.log('--- Available NFT Cards in DB ---');
    console.table(allNfts.rows);

    await pool.end();
}

checkNFTAndPayout();
