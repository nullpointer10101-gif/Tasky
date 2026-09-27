const fs = require('fs');
const path = require('path');

console.log('=== Step 1: Update miniapp/index.html with AdExium SDK ===');
const indexHtmlPath = 'd:/antigravity/HashBee/miniapp/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const adexiumSnippet = `    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js?56"></script>
    <!-- AdExium Widget Monetization -->
    <script type="text/javascript" src="https://cdn.tgads.space/assets/js/adexium-widget.min.js"></script>
    <script type="text/javascript">
      document.addEventListener('DOMContentLoaded', () => {
        try {
          if (window.AdexiumWidget) {
            const adexiumWidget = new window.AdexiumWidget({
              wid: '8e21d2a6-6c80-4b16-baf9-990e07ff2f00',
              adFormat: 'interstitial'
            });
            adexiumWidget.autoMode();
            window.adexiumWidget = adexiumWidget;
            console.log('[AdExium] Initialized autoMode successfully (WID: 8e21d2a6-6c80-4b16-baf9-990e07ff2f00)');
          }
        } catch (e) {
          console.error('[AdExium] init error:', e);
        }
      });
    </script>`;

indexHtml = indexHtml.replace(/<!-- Telegram WebApp SDK -->\s*<script src="https:\/\/telegram\.org\/js\/telegram-web-app\.js"><\/script>/, adexiumSnippet);

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('✅ miniapp/index.html updated with AdExium script');
