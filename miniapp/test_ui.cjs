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
  await page.goto('http://localhost:5173/?mock=true', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for initial load...');
  await new Promise(r => setTimeout(r, 2000));
  
  const tabs = ['Home', 'Tasks', 'Rig', 'Wallet', 'Referral', 'Profile'];
  
  for (const tab of tabs) {
    console.log(`Clicking tab: ${tab}`);
    try {
      await page.evaluate((tabName) => {
        const spans = Array.from(document.querySelectorAll('span'));
        const span = spans.find(s => s.textContent.trim() === tabName);
        if (span && span.parentElement) {
          span.parentElement.click();
        }
      }, tab);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Error clicking tab ${tab}:`, e);
    }
  }

  // Check Wallet specifically, as requested
  console.log('Clicking Wallet tab again to be sure...');
  try {
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const span = spans.find(s => s.textContent.trim() === 'Wallet');
      if (span && span.parentElement) {
        span.parentElement.click();
      }
    });
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {}

  await page.screenshot({ path: 'final_screen.png' });
  console.log('Finished testing, took screenshot final_screen.png');

  await browser.close();
})();
