const fs = require('fs');

console.log('=== Step 1: Update miniapp/index.html ===');
const indexHtmlPath = 'd:/antigravity/HashBee/miniapp/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const updatedAdexiumSnippet = `    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js?56"></script>
    <!-- AdExium Widget Monetization -->
    <script type="text/javascript" src="https://cdn.tgads.space/assets/js/adexium-widget.min.js"></script>
    <script type="text/javascript">
      window.showAdexiumOpenAd = function() {
        try {
          if (!window.adexiumWidget && window.AdexiumWidget) {
            window.adexiumWidget = new window.AdexiumWidget({
              wid: '8e21d2a6-6c80-4b16-baf9-990e07ff2f00',
              adFormat: 'interstitial'
            });
            window.adexiumWidget.autoMode();
          }
          if (window.adexiumWidget) {
            console.log('[AdExium] 🚀 Triggering interstitial ad on bot open...');
            if (typeof window.adexiumWidget.show === 'function') {
              window.adexiumWidget.show();
            } else if (typeof window.adexiumWidget.requestAd === 'function') {
              window.adexiumWidget.requestAd();
            }
          }
        } catch (e) {
          console.log('[AdExium] onOpen ad error:', e);
        }
      };

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
            setTimeout(() => {
              window.showAdexiumOpenAd();
            }, 1000);
          }
        } catch (e) {
          console.error('[AdExium] init error:', e);
        }
      });
    </script>`;

indexHtml = indexHtml.replace(/<!-- Telegram WebApp SDK -->[\s\S]*?<\/script>\s*<\/script>/, updatedAdexiumSnippet);
if (!indexHtml.includes('showAdexiumOpenAd')) {
  // Replace the whole head adexium block
  indexHtml = indexHtml.replace(/<!-- Telegram WebApp SDK -->[\s\S]*?<\/script>\n\s*<\/head>/, updatedAdexiumSnippet + '\n  </head>');
}
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('✅ miniapp/index.html updated!');

console.log('=== Step 2: Update App.tsx ===');
const appTsxPath = 'd:/antigravity/HashBee/miniapp/src/App.tsx';
let appTsx = fs.readFileSync(appTsxPath, 'utf8');

const newAppExport = `export const App: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }

    // Trigger ad when opening the mini app
    const timer = setTimeout(() => {
      if (typeof (window as any).showAdexiumOpenAd === 'function') {
        (window as any).showAdexiumOpenAd()
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}`;

appTsx = appTsx.replace(/export const App: React\.FC = \(\) => {[\s\S]*?export default App/, newAppExport + '\n\nexport default App');
fs.writeFileSync(appTsxPath, appTsx, 'utf8');
console.log('✅ miniapp/src/App.tsx updated!');
