async function testAdCooldown() {
    const telegram_id = '123456';
    
    console.log('Sending first ad request...');
    const res1 = await fetch('http://localhost:5000/api/withdrawal/watch_ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id })
    });
    console.log('Res 1:', await res1.json());
    
    console.log('Sending second ad request immediately (should fail)...');
    const res2 = await fetch('http://localhost:5000/api/withdrawal/watch_ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id })
    });
    console.log('Res 2:', await res2.json());
}
testAdCooldown();
