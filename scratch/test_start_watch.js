async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/gram/start-watch', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: '7113115456' }) 
    });
    console.log('Start watch response:', res.status, await res.json());
    
    // Now get stats
    const statsRes = await fetch('http://localhost:3000/api/admin/stats', { headers: { 'x-admin-password': 'tasky_secure_admin_pass' } });
    const stats = await statsRes.json();
    console.log('Active Users:', stats.activeUsersList);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
