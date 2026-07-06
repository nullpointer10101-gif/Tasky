const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/api', createProxyMiddleware({ target: 'http://localhost:5000', changeOrigin: true }));
app.use(express.static(path.join(__dirname, 'dist')));

const server = app.listen(3002, async () => {
    console.log('Server running on 3002');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('BROWSER ERROR:', msg.text());
        } else {
            console.log('BROWSER LOG:', msg.text());
        }
    });
    
    page.on('pageerror', err => {
        console.error('PAGE CRASH:', err.message);
    });

    try {
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle0' });
        console.log('Page loaded. Simulating user inject...');
        
        await page.evaluate(() => {
            window.Telegram = {
                WebApp: {
                    initDataUnsafe: {
                        user: { id: 123456, first_name: 'Test', username: 'testuser' }
                    },
                    ready: () => {}, expand: () => {}, onEvent: () => {}
                }
            };
            window.dispatchEvent(new Event('DOMContentLoaded'));
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('Clicking Profile tab...');
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('nav button');
            if (tabs.length >= 5) {
                tabs[4].click(); 
            } else {
                console.log('Tabs not found. HTML:', document.body.innerHTML);
            }
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.content();
        if (html.includes('Something went wrong') || html.includes('Profile Render Error')) {
            console.log('FOUND ERROR SCREEN IN HTML!');
            console.log(html.substring(html.indexOf('Profile Render Error') - 100, html.indexOf('Profile Render Error') + 500));
        } else {
            console.log('No error screen text found. HTML length:', html.length);
        }
    } catch (err) {
        console.error('TEST ERROR:', err);
    } finally {
        await browser.close();
        server.close();
    }
});
