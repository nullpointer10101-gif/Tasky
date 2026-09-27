const fs = require('fs');

console.log('=== 1. Update miniapp/index.html with all Ad SDKs ===');
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
    <link rel="preconnect" href="https://ad.gigapub.tech" crossorigin />
    <link rel="preconnect" href="https://cdn.tgads.space" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    
    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js?56"></script>

    <!-- AdExium Widget Monetization -->
    <script id="adexium-widget-sdk" type="text/javascript" src="https://cdn.tgads.space/assets/js/adexium-widget.min.js"></script>

    <!-- GigaPub Ad SDK (Fallback) -->
    <script id="gigapub-ad-sdk" type="text/javascript" src="https://ad.gigapub.tech/script?id=7451"></script>
    <script id="gigapub-offerwall-sdk" type="text/javascript" src="https://wall.giga.pub/api/v1/loader.js?projectId=7451" async></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('✅ miniapp/index.html updated!');

console.log('=== 2. Create adService.ts ===');
const adServicePath = 'd:/antigravity/HashBee/miniapp/src/services/adService.ts';
const adServiceCode = `// Ad Manager for HashBee
const ADEXIUM_PRIMARY_WID = '8e21d2a6-6c80-4b16-baf9-990e07ff2f00';
const ADEXIUM_FALLBACK_WID = 'e93d690f-bdc3-4ed5-8d9f-8f208afa3774';

let adexiumInstance: any = null;

export function getOrInitAdexium(wid: string = ADEXIUM_PRIMARY_WID) {
  if (typeof window === 'undefined') return null;
  const WidgetClass = (window as any).AdexiumWidget || (window as any).TGAdsWidget;
  if (typeof WidgetClass !== 'function') return null;

  try {
    const instance = new WidgetClass({
      wid: wid,
      adFormat: 'interstitial',
      debug: false
    });
    return instance;
  } catch (e) {
    console.warn('[AdManager] Adexium init failed for WID:', wid, e);
    return null;
  }
}

export async function showGigaPub(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const fn = (window as any).showGiga || (window as any).showGigaPubAd || (window as any).showGigaAd || 
             ((window as any).GigaPub && ((window as any).GigaPub.showAd || (window as any).GigaPub.show));
  
  if (typeof fn !== 'function') return false;

  return new Promise((resolve) => {
    try {
      console.log('[AdManager] 🎬 Showing GigaPub Rewarded Video...');
      const res = fn.call((window as any).GigaPub || window);
      if (res && typeof res.then === 'function') {
        res.then(() => resolve(true)).catch(() => resolve(false));
      } else {
        resolve(true);
      }
    } catch (e) {
      console.warn('[AdManager] GigaPub error:', e);
      resolve(false);
    }
  });
}

export function showOpenAd(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise(async (resolve) => {
    // 1. Try Adexium Primary WID
    let widget = getOrInitAdexium(ADEXIUM_PRIMARY_WID);
    
    // Wait for script if needed
    if (!widget) {
      let waited = 0;
      while (!widget && waited < 1200) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
        widget = getOrInitAdexium(ADEXIUM_PRIMARY_WID);
      }
    }

    if (!widget) {
      // Fallback to GigaPub
      console.warn('[AdManager] Adexium not ready, trying GigaPub fallback...');
      const gigaRes = await showGigaPub();
      return resolve(gigaRes);
    }

    let settled = false;

    const cleanup = () => {
      try {
        if (widget.off) {
          widget.off('adReceived', onAdReceived);
          widget.off('adClosed', onClosed);
          widget.off('requestAdError', onError);
          widget.off('noAdFound', onNoAd);
        }
      } catch (e) {}
    };

    const onAdReceived = (ad: any) => {
      console.log('[AdManager] 🎯 Adexium adReceived — displaying interstitial...');
      try {
        if (typeof widget.displayAd === 'function') {
          widget.displayAd(ad);
        }
      } catch (e) {
        console.error('[AdManager] Error calling displayAd:', e);
        onError();
      }
    };

    const onClosed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      console.log('[AdManager] Adexium ad closed');
      resolve(true);
    };

    const tryFallback = async () => {
      if (settled) return;
      console.log('[AdManager] Adexium no-ad/error, trying fallback WID...');
      const fallbackWidget = getOrInitAdexium(ADEXIUM_FALLBACK_WID);
      if (fallbackWidget) {
        try {
          fallbackWidget.on('adReceived', (ad: any) => {
            try { fallbackWidget.displayAd(ad); } catch (e) {}
          });
          fallbackWidget.on('adClosed', () => {
            if (!settled) { settled = true; resolve(true); }
          });
          fallbackWidget.on('noAdFound', async () => {
            if (!settled) { settled = true; const r = await showGigaPub(); resolve(r); }
          });
          fallbackWidget.on('requestAdError', async () => {
            if (!settled) { settled = true; const r = await showGigaPub(); resolve(r); }
          });
          fallbackWidget.requestAd('interstitial');
          return;
        } catch (e) {}
      }
      settled = true;
      const gigaRes = await showGigaPub();
      resolve(gigaRes);
    };

    const onError = () => {
      cleanup();
      tryFallback();
    };

    const onNoAd = () => {
      cleanup();
      tryFallback();
    };

    try {
      widget.on('adReceived', onAdReceived);
      widget.on('adClosed', onClosed);
      widget.on('requestAdError', onError);
      widget.on('noAdFound', onNoAd);

      console.log('[AdManager] 🚀 Requesting Adexium ad for HashBee...');
      widget.requestAd('interstitial');
    } catch (e) {
      onError();
    }

    // Safety timeout
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(false);
      }
    }, 15000);
  });
}
`;
fs.writeFileSync(adServicePath, adServiceCode, 'utf8');
console.log('✅ adService.ts created!');

console.log('=== 3. Update App.tsx to call showOpenAd ===');
const appTsxPath = 'd:/antigravity/HashBee/miniapp/src/App.tsx';
const appTsxCode = `import React, { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Referrals } from './pages/Referrals'
import { Missions } from './pages/Missions'
import { Withdraw } from './pages/Withdraw'
import { BannedScreen } from './components/BannedScreen'
import { showOpenAd } from './services/adService'

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

    // Trigger ad when opening the mini app
    const timer = setTimeout(() => {
      console.log('[HashBee] Triggering opening ad on launch...');
      showOpenAd()
    }, 800)

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
fs.writeFileSync(appTsxPath, appTsxCode, 'utf8');
console.log('✅ miniapp/src/App.tsx updated!');
