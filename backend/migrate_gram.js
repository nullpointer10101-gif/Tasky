require('dotenv').config();
const { initDB } = require('./db');

async function run() {
    try {
        console.log('Running initDB to apply new gram schema additions...');
        await initDB();
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
