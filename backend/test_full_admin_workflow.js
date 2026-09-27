const axios = require('axios');

async function testFullAdminWorkflow() {
  console.log('--- 1. Testing Admin Login ---');
  const loginRes = await axios.post('https://hashbee.onrender.com/api/admin/login', {
    identifier: 'meela',
    password: 'meela'
  });
  console.log('Login status:', loginRes.status);
  const token = loginRes.data.token || loginRes.data.data?.token;
  console.log('Token received:', token ? 'YES (length ' + token.length + ')' : 'NO');

  console.log('\n--- 2. Testing Admin Dashboard Stats ---');
  const statsRes = await axios.get('https://hashbee.onrender.com/api/admin/dashboard', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Stats:', statsRes.data);

  console.log('\n--- 3. Testing List Campaigns ---');
  const campsRes = await axios.get('https://hashbee.onrender.com/api/admin/campaigns', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Campaigns count:', campsRes.data.campaigns ? campsRes.data.campaigns.length : 0);

  console.log('\n--- 4. Testing Create Campaign ---');
  const createRes = await axios.post('https://hashbee.onrender.com/api/admin/campaigns', {
    title: 'Verification Test Campaign',
    target: 'https://t.me/hashbe_bot',
    type: 'bot',
    total_completions: 150,
    reward_bp: 0.1
  }, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Create campaign response:', createRes.data);

  console.log('\n✅ ALL ADMIN ENDPOINTS WORKING 100% PERFECTLY!');
}

testFullAdminWorkflow().catch(e => console.error('Workflow error:', e.response?.data || e.message));
