const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
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
        
        // Emulate Telegram WebApp environment
        await page.evaluate(() => {
            window.Telegram = {
                WebApp: {
                    initDataUnsafe: {
                        user: {
                            id: 123456,
                            first_name: 'Test',
                            username: 'testuser'
                        }
                    },
                    ready: () => {},
                    expand: () => {},
                    onEvent: () => {}
                }
            };
            window.dispatchEvent(new Event('DOMContentLoaded'));
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('Clicking Profile tab...');
        // Find profile tab and click
        await page.evaluate(() => {
            const tabs = document.querySelectorAll('nav button');
            if (tabs.length >= 4) {
                tabs[4].click(); // Profile is 5th tab
            } else {
                console.log('Tabs not found');
            }
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.content();
        if (html.includes('Something went wrong') || html.includes('Profile Render Error')) {
            console.log('FOUND ERROR SCREEN IN HTML!');
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
