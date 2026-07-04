const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Intercept logs and errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Browser UNCAUGHT EXCEPTION]', error);
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/?mock=true', { waitUntil: 'domcontentloaded' }); // don't wait for networkidle
  
  const tabs = ['Home', 'Tasks', 'Rig', 'Wallet', 'Referral', 'Profile'];
  
  // RAPID SWITCHING
  for (let i = 0; i < 3; i++) {
    for (const tab of tabs) {
      console.log(`Rapidly clicking tab: ${tab}`);
      try {
        await page.evaluate((tabName) => {
          const spans = Array.from(document.querySelectorAll('span'));
          const span = spans.find(s => s.textContent.trim() === tabName);
          if (span && span.parentElement) {
            span.parentElement.click();
          }
        }, tab);
        // almost NO delay, maybe 50ms
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error(`Error clicking tab ${tab}:`, e);
      }
    }
  }

  // Final screenshot
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'rapid_switch_final_screen.png' });
  console.log('Finished testing, took screenshot rapid_switch_final_screen.png');

  await browser.close();
})();
