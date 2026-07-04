const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log("Starting Vite...");
  const viteProcess = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--port', '5177'], { stdio: 'pipe' });
  
  // Wait a few seconds for Vite to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log("Starting Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:5177/', { waitUntil: 'networkidle2' });
  } catch(e) {
    console.error("Navigation failed", e);
  }
  
  await browser.close();
  viteProcess.kill();
  console.log("Done.");
})();
