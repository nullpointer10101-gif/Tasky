const { Pool } = require('pg');

const oldUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const newUrl = 'postgresql://postgres.dnnubveqzoxrnkgbnxrr:AleekAleem123%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const oldPool = new Pool({ connectionString: oldUrl });
const newPool = new Pool({ connectionString: newUrl });

async function migrateAll() {
    try {
        console.log('Starting full database migration...');
        
        console.log('Cleaning up seeded data in new DB to prevent ID conflicts...');
        await newPool.query(`TRUNCATE tasks, machines, user_tasks, user_machines, mining_sessions, withdrawals, withdrawal_settings, referral_rules, system_settings CASCADE`);
        
        const tables = [
            'tasks',
            'machines',
            'user_tasks',
            'user_machines',
            'mining_sessions',
            'withdrawals',
            'withdrawal_settings',
            'referral_rules',
            'system_settings'
        ];

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            const { rows } = await oldPool.query(`SELECT * FROM ${table}`);
            
            if (rows.length === 0) {
                console.log(`- ${table} is empty. Skipping.`);
                continue;
            }

            const columns = Object.keys(rows[0]);
            
            for (const row of rows) {
                const values = columns.map(col => row[col]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = columns.map(c => `"${c}"`).join(', ');

                await newPool.query(`
                    INSERT INTO ${table} (${colNames})
                    VALUES (${placeholders})
                `, values);
            }
            console.log(`- Successfully copied ${rows.length} rows to ${table}.`);
        }

        console.log('Fixing auto-increment counters...');
        for (const table of ['tasks', 'machines', 'user_tasks', 'user_machines', 'mining_sessions', 'withdrawals']) {
            try {
                 await newPool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1) + 1) FROM ${table};`);
            } catch (e) {}
        }

        console.log('FULL MIGRATION COMPLETE!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await oldPool.end();
        await newPool.end();
    }
}

migrateAll();
