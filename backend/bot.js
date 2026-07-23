const TelegramBot = require('node-telegram-bot-api');
const { pool } = require('./db');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const API_BASE = `http://localhost:${PORT}/api`;

let bot;
if (token && token !== 'your_bot_token_here') {
    bot = new TelegramBot(token, { polling: true });
    
    bot.on('polling_error', (error) => {
        console.error('Polling error:', error.code, error.message);
    });
} else {
    // dummy bot fallback
    bot = {
        onText: () => {},
        on: () => {},
        sendMessage: () => {}
    };
    console.log('Telegram Bot token not provided or is default, bot not started.');
}

const isAdmin = (msg) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    return adminId && msg.chat.id.toString() === adminId.toString();
};

const userStates = {};

// =======================
// User-Facing Commands
// =======================

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const refCode = match[1];
    
    try {
        await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: msg.from.id,
                username: msg.from.username,
                first_name: msg.from.first_name,
                ref: refCode
            })
        });
        
        const webAppUrl = process.env.WEBAPP_URL || 'https://tasky-kohl-six.vercel.app/'; // User needs to set WEBAPP_URL in .env
        
        // Set the permanent menu button to open the web app
        try {
            await bot.setChatMenuButton({
                chat_id: chatId,
                menu_button: {
                    type: 'web_app',
                    text: 'Play Tasky',
                    web_app: { url: webAppUrl }
                }
            });
        } catch (e) {
            console.error('Failed to set chat menu button:', e.message);
        }

        const captionText = `🚀 *Welcome to TASKY, ${msg.from.first_name}!*\n\nStart earning crypto instantly with the ultimate Web3 bot.\n\n✅ *Complete Tasks*\n🤝 *Invite Friends*\n⛏ *Mine & Grow*\n🎁 *Daily Rewards*\n\nTap below to launch your rig and start earning! 👇`;

        const opts = {
            caption: captionText,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🐾 Launch TASKY', web_app: { url: webAppUrl } }],
                    [
                        { text: '📢 Channel', url: 'https://t.me/Tasky_Official' },
                        { text: '💬 Community', url: 'https://t.me/TaskyOfficialCommunity' }
                    ]
                ]
            }
        };
        
        const path = require('path');
        const fs = require('fs');
        const imagePath = path.join(__dirname, 'assets', 'welcome_promo.png');
        
        if (fs.existsSync(imagePath)) {
            bot.sendPhoto(chatId, fs.createReadStream(imagePath), opts);
        } else {
            bot.sendMessage(chatId, opts.caption, opts);
        }
    } catch (e) {
         bot.sendMessage(chatId, 'Error connecting to the server. Please try again later.');
    }
});

bot.onText(/Tasks 📋|\/tasks/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_BASE}/tasks?telegram_id=${msg.from.id}`);
        const tasks = await res.json();
        
        if (!tasks || tasks.length === 0) {
            return bot.sendMessage(chatId, 'No active tasks at the moment.');
        }
        
        for (const task of tasks) {
            const status = task.completed ? '✅ Completed' : '❌ Pending';
            const text = `*${task.title}*\n${task.subtitle}\nReward: ${task.reward_tasky} TASKY\nStatus: ${status}`;
            
            const opts = { parse_mode: 'Markdown' };
            if (!task.completed) {
                opts.reply_markup = {
                    inline_keyboard: [
                        [{ text: 'Do Task', url: task.action_url || 'https://google.com' }],
                        [{ text: 'Verify Completion', callback_data: `verify_${task.id}` }]
                    ]
                };
            }
            await bot.sendMessage(chatId, text, opts);
        }
    } catch(e) {
        bot.sendMessage(chatId, 'Failed to fetch tasks.');
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('verify_')) {
        const taskId = data.split('_')[1];
        try {
            const res = await fetch(`${API_BASE}/tasks/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_id: query.from.id, task_id: taskId })
            });
            const result = await res.json();
            
            // The API internally handles sending the success message to the user!
            if (!res.ok) {
                bot.sendMessage(chatId, `Failed: ${result.error}`);
            }
        } catch(e) {
             bot.sendMessage(chatId, 'Error verifying task.');
        }
    } else if (data.startsWith('approve_') || data.startsWith('reject_')) {
        const action = data.startsWith('approve_') ? 'approved' : 'rejected';
        const userTaskId = data.split('_')[1];
        
        try {
            const utRes = await pool.query('SELECT * FROM user_tasks WHERE id = $1', [userTaskId]);
            if (utRes.rows.length === 0) {
                return bot.answerCallbackQuery(query.id, { text: 'Task submission not found' });
            }
            
            const ut = utRes.rows[0];
            if (ut.status !== 'pending') {
                return bot.answerCallbackQuery(query.id, { text: `Already ${ut.status}` });
            }
            
            const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [ut.task_id]);
            const task = taskRes.rows[0];
            
            if (action === 'approved') {
                const reward = parseFloat(task.reward_tasky);
                await pool.query('BEGIN');
                await pool.query('UPDATE user_tasks SET status = $1, reviewed_at = NOW() WHERE id = $2', [action, userTaskId]);
                await pool.query('UPDATE users SET balance = balance + $1 WHERE telegram_id = $2', [reward, ut.telegram_id]);
                await pool.query('COMMIT');
                
                bot.sendMessage(ut.telegram_id, `✅ Your submission for "${task.title}" has been approved! +${reward} TASKY`);
                bot.editMessageText(`✅ Approved by admin\n\n` + query.message.text, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
            } else {
                await pool.query('UPDATE user_tasks SET status = $1, reviewed_at = NOW(), rejection_reason = $3 WHERE id = $2', [action, userTaskId, 'Invalid proof']);
                
                bot.sendMessage(ut.telegram_id, `❌ Your submission for "${task.title}" was rejected. Please ensure you provide valid proof.`);
                bot.editMessageText(`❌ Rejected by admin\n\n` + query.message.text, {
                    chat_id: chatId,
                    message_id: query.message.message_id
                });
            }
            bot.answerCallbackQuery(query.id, { text: `Marked as ${action}` });
        } catch (err) {
            console.error('Admin approval error:', err);
            bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
        }
    }
});

bot.onText(/Check-in ✅|\/checkin/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_BASE}/users/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: msg.from.id })
        });
        const result = await res.json();
        
        if (!res.ok) {
            bot.sendMessage(chatId, result.error || 'Check-in failed');
        }
        // Note: API already triggers success message internally via bot.sendMessage
    } catch(e) {
        bot.sendMessage(chatId, 'Error checking in.');
    }
});

bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_BASE}/users/${msg.from.id}`);
        if (res.ok) {
            const user = await res.json();
            bot.sendMessage(chatId, `Your current balance is: ${user.balance} TASKY`);
        } else {
            bot.sendMessage(chatId, 'User not found.');
        }
    } catch(e) {}
});

bot.onText(/Referral 🔗|\/referral/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_BASE}/referral/${msg.from.id}`);
        if (!res.ok) return bot.sendMessage(chatId, 'Could not fetch referral info.');
        const result = await res.json();
        
        const text = `🔗 *Your Referral Link:*\n${result.referral_link}\n\nTotal Referrals: ${result.total_referrals}`;
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: 'Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(result.referral_link)}&text=Join%20Tasky%20and%20earn%20crypto!` }]]
            }
        };
        bot.sendMessage(chatId, text, opts);
    } catch(e) {
        bot.sendMessage(chatId, 'Error fetching referral data.');
    }
});

bot.onText(/Help ❓|\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, "Complete tasks, earn TASKY, swap for real TON or USDT");
});

bot.onText(/Swap 💱|\/swap/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const res = await fetch(`${API_BASE}/swap/rates`);
        const rates = await res.json();
        let text = 'Current Swap Rates:\n';
        rates.forEach(r => {
            text += `${r.token_name}: ${r.tasky_per_unit} TASKY (Min: ${r.min_tasky})\n`;
        });
        
        text += '\nHow much TASKY would you like to swap? (Enter amount)';
        bot.sendMessage(chatId, text);
        userStates[chatId] = { step: 'swap_amount' };
    } catch(e) {
         bot.sendMessage(chatId, 'Error fetching swap rates.');
    }
});

bot.onText(/\/cancel/, (msg) => {
    delete userStates[msg.chat.id];
    bot.sendMessage(msg.chat.id, 'Action cancelled.');
});

// Interactive step handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.startsWith('/')) return;
    if (['Tasks 📋', 'Check-in ✅', 'Referral 🔗', 'Swap 💱', 'Help ❓'].includes(text)) return;
    
    const state = userStates[chatId];
    if (!state) return;
    
    if (state.step === 'swap_amount') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount < 500) {
            return bot.sendMessage(chatId, 'Invalid amount. Minimum swap is 500. Enter again or /cancel:');
        }
        state.amount = amount;
        state.step = 'swap_token';
        bot.sendMessage(chatId, 'Which token do you want to receive? (TON or USDT)');
    } else if (state.step === 'swap_token') {
        const tokenStr = text.toUpperCase();
        if (tokenStr !== 'TON' && tokenStr !== 'USDT') {
             return bot.sendMessage(chatId, 'Invalid token. Enter TON or USDT:');
        }
        state.token = tokenStr;
        state.step = 'swap_wallet';
        bot.sendMessage(chatId, 'Enter your wallet address:');
    } else if (state.step === 'swap_wallet') {
        state.wallet = text;
        state.step = null;
        
        try {
            const res = await fetch(`${API_BASE}/swap/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: msg.from.id,
                    tasky_amount: state.amount,
                    receive_token: state.token,
                    wallet_address: state.wallet
                })
            });
            const result = await res.json();
            if (!res.ok) {
                 bot.sendMessage(chatId, `Swap failed: ${result.error}`);
            }
        } catch(e) {
             bot.sendMessage(chatId, 'Error submitting swap request.');
        }
        delete userStates[chatId];
    }
    
    else if (state.step === 'addtask_title') {
        state.task.title = text;
        state.step = 'addtask_subtitle';
        bot.sendMessage(chatId, 'Enter subtitle:');
    } else if (state.step === 'addtask_subtitle') {
        state.task.subtitle = text;
        state.step = 'addtask_type';
        bot.sendMessage(chatId, 'Enter type (telegram/twitter/youtube/general):');
    } else if (state.step === 'addtask_type') {
        state.task.type = text.toLowerCase();
        
        if (state.task.type === 'telegram') {
            state.step = 'addtask_verification_type';
            bot.sendMessage(chatId, 'What verification? auto_telegram or proof_screenshot?');
        } else if (state.task.type === 'twitter') {
            state.step = 'addtask_x_subtype';
            bot.sendMessage(chatId, 'What X subtype? (follow or repost)?');
        } else {
            state.task.verification_type = 'proof_screenshot';
            state.step = 'addtask_reward';
            bot.sendMessage(chatId, 'Enter reward amount:\n\n*Ranges:*\nSimple: 15-30 TASKY\nProof-required: 40-80 TASKY\nFeatured: 100-200 TASKY', { parse_mode: 'Markdown' });
        }
    } else if (state.step === 'addtask_x_subtype') {
        state.task.x_subtype = text.toLowerCase();
        if (state.task.x_subtype === 'follow') {
            state.task.verification_type = 'proof_username';
        } else {
            state.task.verification_type = 'proof_url';
        }
        state.step = 'addtask_reward';
        bot.sendMessage(chatId, 'Enter reward amount:\n\n*Ranges:*\nSimple: 15-30 TASKY\nProof-required: 40-80 TASKY\nFeatured: 100-200 TASKY', { parse_mode: 'Markdown' });
    } else if (state.step === 'addtask_verification_type') {
        state.task.verification_type = text;
        if (state.task.verification_type === 'auto_telegram') {
            state.step = 'addtask_chat_id';
            bot.sendMessage(chatId, 'Enter the Telegram chat username or ID to check membership against:');
        } else {
            state.step = 'addtask_reward';
            bot.sendMessage(chatId, 'Enter reward amount:\n\n*Ranges:*\nSimple: 15-30 TASKY\nProof-required: 40-80 TASKY\nFeatured: 100-200 TASKY', { parse_mode: 'Markdown' });
        }
    } else if (state.step === 'addtask_chat_id') {
        state.task.telegram_chat_id = text;
        state.step = 'addtask_reward';
        bot.sendMessage(chatId, 'Enter reward amount:\n\n*Ranges:*\nSimple: 15-30 TASKY\nProof-required: 40-80 TASKY\nFeatured: 100-200 TASKY', { parse_mode: 'Markdown' });
    } else if (state.step === 'addtask_reward') {
        state.task.reward_tasky = parseFloat(text);
        state.step = 'addtask_url';
        bot.sendMessage(chatId, 'Enter action url:');
    } else if (state.step === 'addtask_url') {
        state.task.action_url = text;
        state.step = 'addtask_featured';
        bot.sendMessage(chatId, 'Is featured? (y/n):');
    } else if (state.step === 'addtask_featured') {
        state.task.is_featured = text.toLowerCase() === 'y';
        
        try {
            const adminId = process.env.ADMIN_TELEGRAM_ID;
            const res = await fetch(`${API_BASE}/tasks/admin/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-id': adminId
                },
                body: JSON.stringify(state.task)
            });
            if (res.ok) {
                bot.sendMessage(chatId, 'Task created successfully!');
            } else {
                const r = await res.json();
                bot.sendMessage(chatId, `Failed: ${r.error}`);
            }
        } catch(e) {
            bot.sendMessage(chatId, 'Error creating task.');
        }
        delete userStates[chatId];
    } else if (state.step === 'addmachine_name') {
        state.machine.name = text;
        state.step = 'addmachine_rarity';
        bot.sendMessage(chatId, 'Enter rarity (common/rare/epic/legendary):');
    } else if (state.step === 'addmachine_rarity') {
        state.machine.rarity = text.toLowerCase();
        state.step = 'addmachine_min_holding';
        bot.sendMessage(chatId, 'Enter min_holding required:');
    } else if (state.step === 'addmachine_min_holding') {
        state.machine.min_holding = parseFloat(text);
        state.step = 'addmachine_speed_bonus';
        bot.sendMessage(chatId, 'Enter speed_bonus_percent:');
    } else if (state.step === 'addmachine_speed_bonus') {
        state.machine.speed_bonus_percent = parseFloat(text);
        state.step = 'addmachine_icon_key';
        bot.sendMessage(chatId, 'Enter icon_key (short identifier, no spaces):');
    } else if (state.step === 'addmachine_icon_key') {
        state.machine.icon_key = text;
        state.step = 'addmachine_reveal';
        bot.sendMessage(chatId, 'Enter reveal_at_holding (holding amount when it becomes visible as teaser):');
    } else if (state.step === 'addmachine_reveal') {
        state.machine.reveal_at_holding = parseFloat(text);
        state.step = 'addmachine_sort_order';
        bot.sendMessage(chatId, 'Enter sort_order (number, controls display order, use next available number):');
    } else if (state.step === 'addmachine_sort_order') {
        state.machine.sort_order = parseInt(text);
        
        try {
            const m = state.machine;
            await pool.query(`
                INSERT INTO machines (name, rarity, min_holding, speed_bonus_percent, icon_key, reveal_at_holding, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [m.name, m.rarity, m.min_holding, m.speed_bonus_percent, m.icon_key, m.reveal_at_holding, m.sort_order]);
            bot.sendMessage(chatId, `Machine created: ${m.name} (${m.rarity})`);
        } catch(e) {
            console.error(e);
            bot.sendMessage(chatId, 'Error creating machine.');
        }
        delete userStates[chatId];
    }
});


// =======================
// Admin Commands
// =======================

bot.onText(/\/addtask/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    bot.sendMessage(chatId, 'Enter task title:');
    userStates[chatId] = { step: 'addtask_title', task: {} };
});

bot.onText(/\/listtasks/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const { rows } = await pool.query(`
            SELECT t.*, COUNT(ut.id) as completion_count
            FROM tasks t
            LEFT JOIN user_tasks ut ON t.id = ut.task_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
        if (rows.length === 0) return bot.sendMessage(chatId, 'No tasks found.');
        let text = 'Tasks:\n';
        rows.forEach(r => {
            text += `[${r.id}] ${r.title} | ${r.is_active ? 'Active' : 'Inactive'} | Completions: ${r.completion_count}\n`;
        });
        bot.sendMessage(chatId, text);
    } catch(e) {
         bot.sendMessage(chatId, 'Error listing tasks.');
    }
});

bot.onText(/\/deactivatetask (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        const res = await fetch(`${API_BASE}/tasks/admin/deactivate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-id': adminId
            },
            body: JSON.stringify({ task_id: match[1] })
        });
        if (res.ok) bot.sendMessage(chatId, `Task ${match[1]} deactivated.`);
        else bot.sendMessage(chatId, 'Failed to deactivate task.');
    } catch(e) {
        bot.sendMessage(chatId, 'Error deactivating task.');
    }
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const usersRes = await pool.query('SELECT COUNT(*) as c FROM users');
        const tasksRes = await pool.query('SELECT COUNT(*) as c FROM user_tasks');
        const taskyRes = await pool.query('SELECT SUM(balance) as s FROM users');
        const swapsRes = await pool.query("SELECT COUNT(*) as c FROM swaps WHERE status = 'pending'");
        
        const users = usersRes.rows[0].c;
        const tasks = tasksRes.rows[0].c;
        const tasky = taskyRes.rows[0].s || 0;
        const pending = swapsRes.rows[0].c;
        
        const text = `*TASKY Stats:*\nUsers: ${users}\nTasks Completed: ${tasks}\nTotal TASKY Supply: ${tasky}\nPending Swaps: ${pending}`;
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) {
         bot.sendMessage(chatId, 'Error fetching stats.');
    }
});

// Admin commands from previous swap implementation
bot.onText(/\/swaprates/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const { rows } = await pool.query('SELECT * FROM swap_rates WHERE is_active = TRUE');
        if (rows.length === 0) {
            return bot.sendMessage(chatId, 'No active swap rates found.');
        }
        let text = 'Current Swap Rates:\n';
        rows.forEach(r => {
            text += `${r.token_name}: ${r.tasky_per_unit} TASKY per unit (Min: ${r.min_tasky})\n`;
        });
        bot.sendMessage(chatId, text);
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Error fetching rates.');
    }
});

bot.onText(/\/updaterate (\w+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const token_name = match[1].toUpperCase();
    const rate = parseFloat(match[2]);
    
    try {
        const { rows } = await pool.query(`
            UPDATE swap_rates 
            SET tasky_per_unit = $1, updated_at = CURRENT_TIMESTAMP
            WHERE token_name = $2 RETURNING *
        `, [rate, token_name]);
        
        if (rows.length === 0) {
            bot.sendMessage(chatId, `Rate for ${token_name} not found.`);
        } else {
            bot.sendMessage(chatId, `Rate updated! ${token_name} is now ${rate} TASKY per unit.`);
        }
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Error updating rate.');
    }
});

bot.onText(/\/pendingswaps/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const { rows } = await pool.query(`
            SELECT s.*, u.username, u.first_name 
            FROM swaps s 
            JOIN users u ON s.telegram_id = u.telegram_id 
            WHERE s.status = 'pending'
            ORDER BY s.requested_at ASC
        `);
        if (rows.length === 0) {
            return bot.sendMessage(chatId, 'No pending swaps.');
        }
        let text = 'Pending Swaps:\n';
        rows.forEach(r => {
            text += `ID: ${r.id} | @${r.username || r.first_name} | ${r.tasky_amount} TASKY -> ${r.receive_amount} ${r.receive_token} | Addr: ${r.wallet_address}\n`;
        });
        bot.sendMessage(chatId, text);
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Error fetching pending swaps.');
    }
});

bot.onText(/\/completeswap (\d+) (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const swap_id = parseInt(match[1]);
    const tx_hash = match[2];
    
    try {
        const { rows } = await pool.query(`
            UPDATE swaps 
            SET status = 'done', tx_hash = $1, processed_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING *
        `, [tx_hash, swap_id]);
        
        if (rows.length === 0) {
            bot.sendMessage(chatId, `Swap ID ${swap_id} not found.`);
        } else {
            const swap = rows[0];
            bot.sendMessage(chatId, `Swap ID ${swap_id} marked as complete.`);
            try {
                bot.sendMessage(swap.telegram_id, `Swap complete! TX: ${tx_hash}`);
            } catch(e) {}
        }
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Error completing swap.');
    }
});

bot.onText(/\/pendingtasks/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const res = await fetch(`${API_BASE}/tasks/admin/pending`, {
            headers: { 'x-admin-id': process.env.ADMIN_TELEGRAM_ID }
        });
        const rows = await res.json();
        if (rows.error) return bot.sendMessage(chatId, `Error: ${rows.error}`);
        if (rows.length === 0) return bot.sendMessage(chatId, 'No pending tasks.');
        let text = 'Pending Tasks:\n';
        rows.forEach(r => {
            text += `[${r.id}] @${r.username || r.first_name} | ${r.title}\nProof: ${r.proof_screenshot_url}\n\n`;
        });
        bot.sendMessage(chatId, text);
    } catch(e) {
         bot.sendMessage(chatId, 'Error listing pending tasks.');
    }
});

bot.onText(/\/reviewtask (\d+) (approve|reject|retry)(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    const user_task_id = match[1];
    const decision = match[2].toLowerCase();
    const reason = match[3];
    
    try {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        const res = await fetch(`${API_BASE}/tasks/admin/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
            body: JSON.stringify({ user_task_id, decision, rejection_reason: reason })
        });
        const result = await res.json();
        if (res.ok) bot.sendMessage(chatId, `Task submission ${user_task_id} ${decision}d.`);
        else bot.sendMessage(chatId, `Failed: ${result.error}`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error reviewing task.');
    }
});

bot.onText(/\/pendingwithdrawals/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const res = await fetch(`${API_BASE}/withdrawal/admin/pending`, {
            headers: { 'x-admin-id': process.env.ADMIN_TELEGRAM_ID }
        });
        const rows = await res.json();
        if (rows.error) return bot.sendMessage(chatId, `Error: ${rows.error}`);
        if (rows.length === 0) return bot.sendMessage(chatId, 'No pending withdrawals.');
        let text = 'Pending Withdrawals:\n';
        rows.forEach(r => {
            text += `[${r.id}] @${r.username || r.first_name} | ${r.tasky_amount} TASKY -> ${r.usdt_amount} USDT | Addr: ${r.wallet_address}\n`;
        });
        bot.sendMessage(chatId, text);
    } catch(e) {
         bot.sendMessage(chatId, 'Error listing pending withdrawals.');
    }
});

bot.onText(/\/reviewwithdrawal (\d+) (approve|reject)(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    const withdrawal_id = match[1];
    const decision = match[2].toLowerCase();
    const reason = match[3];
    
    try {
        const res = await fetch(`${API_BASE}/withdrawal/admin/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-id': process.env.ADMIN_TELEGRAM_ID },
            body: JSON.stringify({ withdrawal_id, decision, rejection_reason: reason })
        });
        const result = await res.json();
        if (res.ok) bot.sendMessage(chatId, `Withdrawal ${withdrawal_id} ${decision}d.`);
        else bot.sendMessage(chatId, `Failed: ${result.error}`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error reviewing withdrawal.');
    }
});

bot.onText(/\/completewithdrawal (\d+) (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    const withdrawal_id = match[1];
    const tx_hash = match[2];
    
    try {
        const res = await fetch(`${API_BASE}/withdrawal/admin/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-id': process.env.ADMIN_TELEGRAM_ID },
            body: JSON.stringify({ withdrawal_id, tx_hash })
        });
        const result = await res.json();
        if (res.ok) bot.sendMessage(chatId, `Withdrawal ${withdrawal_id} marked as complete.`);
        else bot.sendMessage(chatId, `Failed: ${result.error}`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error completing withdrawal.');
    }
});

bot.onText(/\/setwithdrawrules (\d+) (\d+) ([\d.]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const res = await fetch(`${API_BASE}/withdrawal/admin/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-id': process.env.ADMIN_TELEGRAM_ID },
            body: JSON.stringify({ 
                min_withdrawal_tasky: match[1], 
                fee_percent: match[2], 
                usdt_rate: match[3] 
            })
        });
        const result = await res.json();
        if (res.ok) bot.sendMessage(chatId, `Withdrawal rules updated.`);
        else bot.sendMessage(chatId, `Failed: ${result.error}`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error setting withdraw rules.');
    }
});

bot.onText(/\/setreferralrules (\d+) (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        await pool.query(`
            UPDATE referral_rules 
            SET reward_per_referral = $1, tasks_required_for_valid = $2, spin_reward_per_referral = $3 
            WHERE id = 1
        `, [match[1], match[2], match[3]]);
        bot.sendMessage(chatId, `Referral rules updated.`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error setting referral rules.');
    }
});
bot.onText(/\/toggleswapdestination (\w+) (on|off)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const token = match[1].toUpperCase();
        const isActive = match[2].toLowerCase() === 'on';
        
        const res = await pool.query(`
            UPDATE swap_rates 
            SET is_active = $1 
            WHERE token_name = $2 RETURNING *
        `, [isActive, token]);

        if (res.rows.length === 0) {
            bot.sendMessage(chatId, `Token ${token} not found in swap rates.`);
        } else {
            bot.sendMessage(chatId, `${token} swap is now ${isActive ? 'enabled' : 'disabled'}.`);
        }
    } catch(e) {
        bot.sendMessage(chatId, 'Error toggling swap destination.');
    }
});

bot.onText(/\/usdtnotifycount/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const res = await pool.query('SELECT COUNT(*) as c FROM users WHERE notify_usdt_unlock = TRUE');
        bot.sendMessage(chatId, `Users waiting for USDT unlock: ${res.rows[0].c}`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error getting count.');
    }
});

bot.onText(/\/notifyusdtlive/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const res = await pool.query('SELECT telegram_id FROM users WHERE notify_usdt_unlock = TRUE');
        let count = 0;
        for (const row of res.rows) {
            try {
                bot.sendMessage(row.telegram_id, "🎉 USDT swap is now live! Swap your TASKY for USDT right now in the Wallet tab.");
                count++;
            } catch (e) {
                // Ignore send errors
            }
        }
        bot.sendMessage(chatId, `Notification sent to ${count} users.`);
    } catch(e) {
        bot.sendMessage(chatId, 'Error sending notifications.');
    }
});

// --- MINING ADMIN COMMANDS ---

bot.onText(/\/miningstats/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const sessionsRes = await pool.query('SELECT COUNT(*) as c FROM mining_sessions WHERE claimed = FALSE');
        const activeSessions = sessionsRes.rows[0].c;

        const claimedTodayRes = await pool.query(`
            SELECT SUM(tasky_earned) as s FROM mining_sessions 
            WHERE claimed = TRUE AND claimed_at >= CURRENT_DATE
        `);
        const claimedToday = claimedTodayRes.rows[0].s || 0;

        const levelsRes = await pool.query(`
            SELECT mining_level, COUNT(*) as c 
            FROM users 
            GROUP BY mining_level
            ORDER BY mining_level ASC
        `);

        let levelDist = '';
        levelsRes.rows.forEach(r => {
            levelDist += `Level ${r.mining_level}: ${r.c} users\n`;
        });

        const text = `*Mining Stats:*\nActive Sessions: ${activeSessions}\nTASKY Claimed Today: ${claimedToday}\n\n*Level Distribution:*\n${levelDist || 'No users yet.'}`;
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch(e) {
        bot.sendMessage(chatId, 'Error fetching mining stats.');
    }
});

bot.onText(/\/setminingconfig (\d+) ([\d.]+) ([\d.]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const level = parseInt(match[1]);
    const min_holding = parseFloat(match[2]);
    const speed = parseFloat(match[3]);
    
    try {
        const { rowCount } = await pool.query(`
            UPDATE mining_levels
            SET min_holding = $1, base_speed_per_hour = $2
            WHERE level = $3
        `, [min_holding, speed, level]);
        
        if (rowCount > 0) {
            bot.sendMessage(chatId, `Mining Level ${level} updated! Min Holding: ${min_holding}, Speed: ${speed}/hr.`);
        } else {
            bot.sendMessage(chatId, `Level ${level} not found.`);
        }
    } catch(e) {
        bot.sendMessage(chatId, 'Error setting mining config.');
    }
});

bot.onText(/\/setefficiencyconfig (\d+) ([\d.]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const min_days = parseInt(match[1]);
    const multiplier = parseFloat(match[2]);
    
    try {
        const { rowCount } = await pool.query(`
            UPDATE efficiency_tiers
            SET multiplier = $1
            WHERE min_days = $2
        `, [multiplier, min_days]);
        
        if (rowCount > 0) {
            bot.sendMessage(chatId, `Efficiency Tier for ${min_days} days updated! Multiplier: ${multiplier}x.`);
        } else {
            bot.sendMessage(chatId, `Efficiency Tier ${min_days} days not found.`);
        }
    } catch(e) {
        bot.sendMessage(chatId, 'Error setting efficiency config.');
    }
});

bot.onText(/\/addmachine/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    bot.sendMessage(chatId, 'Enter machine name:');
    userStates[chatId] = { step: 'addmachine_name', machine: {} };
});

bot.onText(/\/listmachines/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    try {
        const { rows } = await pool.query('SELECT * FROM machines ORDER BY sort_order ASC');
        if (rows.length === 0) return bot.sendMessage(chatId, 'No machines found.');
        let text = 'Machines:\n';
        rows.forEach(r => {
            text += `[ID: ${r.id}] ${r.name} | ${r.rarity} | Min: ${r.min_holding} | Bonus: ${r.speed_bonus_percent}%\n`;
        });
        bot.sendMessage(chatId, text);
    } catch(e) {
         bot.sendMessage(chatId, 'Error listing machines.');
    }
});

bot.onText(/\/editmachine (\d+) (\w+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const id = parseInt(match[1]);
    const field = match[2];
    const newValue = match[3];
    
    const allowedFields = ['name', 'rarity', 'min_holding', 'speed_bonus_percent', 'icon_key', 'reveal_at_holding', 'sort_order'];
    if (!allowedFields.includes(field)) {
        return bot.sendMessage(chatId, `Invalid field. Allowed: ${allowedFields.join(', ')}`);
    }

    try {
        const { rowCount } = await pool.query(`
            UPDATE machines
            SET ${field} = $1
            WHERE id = $2
        `, [newValue, id]);
        
        if (rowCount > 0) {
            bot.sendMessage(chatId, `Machine ${id} updated: ${field} = ${newValue}`);
        } else {
            bot.sendMessage(chatId, `Machine ID ${id} not found.`);
        }
    } catch(e) {
        console.error(e);
        bot.sendMessage(chatId, 'Error updating machine.');
    }
});

// =======================
// Swap System Commands
// =======================

bot.onText(/\/swaprates/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const { rows } = await pool.query('SELECT * FROM swap_rates WHERE token_name = $1 AND is_active = TRUE', ['USDT']);
        if (rows.length === 0) return bot.sendMessage(chatId, 'No active USDT swap rate found.');
        
        const rate = rows[0];
        bot.sendMessage(chatId, `USDT Rate:\n${rate.tasky_per_unit} TASKY = 1 USDT\nMin Swap: ${rate.min_tasky} TASKY\nChain: ${rate.chain}`);
    } catch (e) {
        bot.sendMessage(chatId, 'Error fetching swap rates.');
    }
});

bot.onText(/\/updaterate (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const tasky_per_unit = parseInt(match[1]);
    
    try {
        const { rowCount } = await pool.query('UPDATE swap_rates SET tasky_per_unit = $1, updated_at = CURRENT_TIMESTAMP WHERE token_name = $2', [tasky_per_unit, 'USDT']);
        if (rowCount > 0) {
            bot.sendMessage(chatId, `USDT rate updated! New rate: ${tasky_per_unit} TASKY = 1 USDT`);
        } else {
            bot.sendMessage(chatId, 'Could not find USDT rate to update.');
        }
    } catch (e) {
        bot.sendMessage(chatId, 'Error updating swap rate.');
    }
});

bot.onText(/\/pendingswaps/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    try {
        const { rows } = await pool.query("SELECT * FROM swaps WHERE status = 'pending' ORDER BY requested_at ASC");
        if (rows.length === 0) return bot.sendMessage(chatId, 'No pending swaps.');
        
        let text = 'Pending Swaps:\n\n';
        rows.forEach(r => {
            text += `Swap ID: ${r.id}\nUser: ${r.telegram_id}\nAmount: ${r.tasky_amount} TASKY -> ${parseFloat(r.receive_amount).toFixed(4)} ${r.receive_token}\nChain: ${r.chain}\nWallet: \`${r.wallet_address}\`\n\n`;
        });
        
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(chatId, 'Error fetching pending swaps.');
    }
});

bot.onText(/\/completeswap (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg)) return;
    
    const swapId = parseInt(match[1]);
    const txHash = match[2];
    
    try {
        const updateRes = await pool.query(`
            UPDATE swaps 
            SET status = 'done', tx_hash = $1, processed_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'pending' RETURNING *
        `, [txHash, swapId]);
        
        if (updateRes.rows.length === 0) {
            return bot.sendMessage(chatId, 'Swap not found or already processed.');
        }
        
        const swap = updateRes.rows[0];
        
        bot.sendMessage(chatId, `Swap ${swapId} marked as done!`);
        
        // Notify user
        try {
            bot.sendMessage(swap.telegram_id, `Swap complete! ${parseFloat(swap.receive_amount).toFixed(4)} USDT sent to your wallet. TX: ${txHash}`);
        } catch (err) {
            // ignore
        }
    } catch (e) {
        bot.sendMessage(chatId, 'Error completing swap.');
    }
});

module.exports = bot;
