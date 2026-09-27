const axios = require('axios');

async function testCreate() {
  try {
    const loginRes = await axios.post('https://hashbee.onrender.com/api/admin/login', {
      identifier: 'meela',
      password: 'meela'
    });
    const token = loginRes.data.token;
    console.log('Got token:', token);

    const campRes = await axios.post('https://hashbee.onrender.com/api/admin/campaigns', {
      title: 'Join Midaso Test',
      target: 'https://t.me/AppMidaso_bot/SPIN?startapp=6446145632',
      type: 'bot',
      total_completions: 200,
      reward_bp: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Created campaign successfully:', campRes.data);
  } catch (err) {
    console.error('Error creating campaign:', err.response?.data || err.message);
  }
}

testCreate();
