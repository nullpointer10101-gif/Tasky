const { Pool } = require('pg');

const oldUrl = 'postgresql://neondb_owner:npg_hdzlyY4E8Dmu@ep-floral-block-ao1exyu8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const newUrl = 'postgresql://postgres.dnnubveqzoxrnkgbnxrr:AleekAleem123%23@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const oldPool = new Pool({ connectionString: oldUrl });
const newPool = new Pool({ connectionString: newUrl });

async function migrate() {
    try {
        console.log('Fetching users from old database...');
        const { rows: users } = await oldPool.query('SELECT * FROM users');
        console.log(`Found ${users.length} users. Migrating...`);

        let count = 0;
        for (const user of users) {
            await newPool.query(`
                INSERT INTO users (telegram_id, username, first_name, balance, total_referrals, streak_days, is_banned, created_at, spins_available)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (telegram_id) DO UPDATE SET 
                    balance = EXCLUDED.balance,
                    total_referrals = EXCLUDED.total_referrals,
                    spins_available = EXCLUDED.spins_available
            `, [
                user.telegram_id,
                user.username,
                user.first_name,
                user.balance,
                user.total_referrals || 0,
                user.streak_days || 0,
                user.is_banned || false,
                user.created_at || new Date(),
                user.spins_available || 0
            ]);
            count++;
        }
        console.log(`Successfully migrated ${count} users to Supabase!`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await oldPool.end();
        await newPool.end();
    }
}

migrate();
