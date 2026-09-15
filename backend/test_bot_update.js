const TelegramBot = require('node-telegram-bot-api');

const token = '123456789:ABCDEF_dummy_token_for_test';
const bot = new TelegramBot(token, { webHook: false });

bot.onText(/\/start/i, (msg) => {
  console.log('✅ ONTEXT TRIGGERED FOR /start!');
});

bot.on('message', (msg) => {
  console.log('✅ ON MESSAGE TRIGGERED:', msg.text);
});

const fakeUpdate = {
  update_id: 999,
  message: {
    message_id: 1,
    from: { id: 123, first_name: 'Test' },
    chat: { id: 123, type: 'private' },
    date: Date.now(),
    text: '/start'
  }
};

console.log('Processing fake update...');
bot.processUpdate(fakeUpdate);
