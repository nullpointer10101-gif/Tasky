process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { pool } = require('../backend/db');

async function auditDatabaseSchema() {
    console.log('====================================================');
    console.log('       TASKY FULL DATABASE AUDIT & DIAGNOSTICS      ');
    console.log('====================================================\n');

    try {
        // 1. Get list of all tables in public schema
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`📋 Found ${tables.length} tables in Neon PostgreSQL:\n`, tables.join(', '), '\n');

        // 2. Count rows in each table
        for (const table of tables) {
            try {
                const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
                console.log(`  ✓ Table [${table.padEnd(25)}]: ${countRes.rows[0].count} rows`);
            } catch (err) {
                console.error(`  ❌ Error counting [${table}]:`, err.message);
            }
        }

        console.log('\n----------------------------------------------------');
        console.log('       CHECKING ESSENTIAL MINI APP TABLES           ');
        console.log('----------------------------------------------------');

        const essentialTables = [
            'users',
            'ad_views',
            'gram_claims',
            'referrals',
            'nft_commission_claims',
            'withdrawals',
            'tasks',
            'user_tasks',
            'campaign_tournaments',
            'campaign_payouts',
            'spin_history',
            'mining_sessions',
            'promo_codes',
            'promo_claims',
            'referral_rules'
        ];

        const missingTables = [];
        for (const reqTable of essentialTables) {
            if (!tables.includes(reqTable)) {
                missingTables.push(reqTable);
            }
        }

        if (missingTables.length === 0) {
            console.log('✅ ALL 15 ESSENTIAL MINI APP TABLES ARE PRESENT!');
        } else {
            console.warn('⚠️ MISSING TABLES IDENTIFIED:', missingTables.join(', '));
        }

        // 3. Inspect columns for key tables (users, gram_claims, referrals, nft_commission_claims)
        console.log('\n----------------------------------------------------');
        console.log('       CHECKING KEY TABLE COLUMNS & TYPES           ');
        console.log('----------------------------------------------------');
        
        for (const table of ['users', 'gram_claims', 'referrals', 'nft_commission_claims', 'ad_views', 'withdrawals']) {
            if (!tables.includes(table)) continue;
            const colsRes = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1;
            `, [table]);
            console.log(`\n📌 Columns in [${table}]:`);
            colsRes.rows.forEach(c => console.log(`   - ${c.column_name.padEnd(25)} (${c.data_type})`));
        }

    } catch (e) {
        console.error('Fatal audit error:', e);
    } finally {
        await pool.end();
    }
}

auditDatabaseSchema();
