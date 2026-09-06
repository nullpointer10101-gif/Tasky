async function poll() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('https://tasky3.onrender.com');
      const text = await res.text();
      if (text.includes('id="root"') || text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>')) {
        console.log('SUCCESS: Tasky3 is now serving Mini App HTML!');
        return;
      }
      console.log(`[${i+1}/20] Waiting for Render deploy... current response:`, text.substring(0, 60));
    } catch (e) {
      console.log(`[${i+1}/20] Render container restarting...`);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
}
poll();
