const fs = require('fs');

console.log('=== 1. Clean miniapp/index.html with pure AdExium setup ===');
const indexHtmlPath = 'd:/antigravity/HashBee/miniapp/index.html';
const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="theme-color" content="#1a1208" />
    <meta name="description" content="HashBee - Earn Honey, Grow Your Swarm, Cash Out Rewards" />
    <title>HashBee 🐝</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://cdn.tgads.space" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    
    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js?56"></script>

    <!-- AdExium Widget Monetization (Pure AdExium Only) -->
    <script type="text/javascript" src="https://cdn.tgads.space/assets/js/adexium-widget.min.js"></script>
    <script type="text/javascript">
      (function() {
        const WID_NEW = '8e21d2a6-6c80-4b16-baf9-990e07ff2f00';
        const WID_ACTIVE = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

        function initWidget(wid) {
          if (!window.AdexiumWidget && !window.TGAdsWidget) return null;
          const Cls = window.AdexiumWidget || window.TGAdsWidget;
          try {
            return new Cls({ wid: wid, adFormat: 'interstitial', debug: false });
          } catch(e) {
            console.error('[AdExium] Error creating instance:', e);
            return null;
          }
        }

        window.showAdexiumAdNow = function() {
          console.log('[AdExium] 🚀 showAdexiumAdNow requested');
          let w = window.adexiumWidget || initWidget(WID_NEW);
          if (!w) {
            console.warn('[AdExium] SDK not ready yet');
            return;
          }

          let showed = false;
          
          w.on('adReceived', function(ad) {
            console.log('[AdExium] 🎯 adReceived -> displayAd');
            showed = true;
            try { w.displayAd(ad); } catch(e) { console.error('[AdExium] displayAd error:', e); }
          });

          w.on('noAdFound', function() {
            if (showed) return;
            console.log('[AdExium] noAdFound for new WID, trying active WID fallback...');
            let wFallback = initWidget(WID_ACTIVE);
            if (wFallback) {
              wFallback.on('adReceived', function(ad2) {
                showed = true;
                try { wFallback.displayAd(ad2); } catch(e) {}
              });
              try { wFallback.requestAd('interstitial'); } catch(e) {}
            }
          });

          w.on('requestAdError', function() {
            if (showed) return;
            console.log('[AdExium] requestAdError for new WID, trying active WID fallback...');
            let wFallback = initWidget(WID_ACTIVE);
            if (wFallback) {
              wFallback.on('adReceived', function(ad2) {
                showed = true;
                try { wFallback.displayAd(ad2); } catch(e) {}
              });
              try { wFallback.requestAd('interstitial'); } catch(e) {}
            }
          });

          try {
            w.requestAd('interstitial');
          } catch(e) {
            console.warn('[AdExium] requestAd failed:', e);
          }
        };

        document.addEventListener('DOMContentLoaded', function() {
          try {
            const adexiumWidget = initWidget(WID_NEW);
            if (adexiumWidget) {
              adexiumWidget.autoMode();
              window.adexiumWidget = adexiumWidget;
              console.log('[AdExium] autoMode active for WID:', WID_NEW);
            }
          } catch (e) {
            console.error('[AdExium] init error:', e);
          }

          // Trigger ad display 1 second after open
          setTimeout(function() {
            window.showAdexiumAdNow();
          }, 1000);
        });
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('✅ miniapp/index.html updated with pure AdExium configuration');

console.log('=== 2. Update App.tsx ===');
const appTsxPath = 'd:/antigravity/HashBee/miniapp/src/App.tsx';
const appTsx = `import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'
import { BannedScreen } from './components/BannedScreen'

const AppContent: React.FC = () => {
  const { user, isBanned, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101715] flex flex-col items-center justify-center text-stone-300">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Loading HashBee...</p>
      </div>
    )
  }

  if (isBanned || user?.status === 'banned') {
    return <BannedScreen />
  }

  return (
    <div className="min-h-screen bg-[#101715] text-[#e6f0ec] font-sans antialiased selection:bg-[#93b3a6] selection:text-[#0f1614]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/earn" element={<Referrals />} />
        <Route path="/tasks" element={<Missions />} />
        <Route path="/withdraw" element={<Withdraw />} />
      </Routes>
      <Navbar />
    </div>
  )
}

export const App: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }

    // Trigger AdExium ad on opening the mini app
    const timer = setTimeout(() => {
      if (typeof (window as any).showAdexiumAdNow === 'function') {
        (window as any).showAdexiumAdNow()
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
`;
fs.writeFileSync(appTsxPath, appTsx, 'utf8');
console.log('✅ miniapp/src/App.tsx updated!');

// Remove adService.ts if present
const adServicePath = 'd:/antigravity/HashBee/miniapp/src/services/adService.ts';
if (fs.existsSync(adServicePath)) {
  fs.unlinkSync(adServicePath);
  console.log('✅ Removed adService.ts (pure AdExium setup in index.html)');
}
