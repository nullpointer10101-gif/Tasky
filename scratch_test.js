async function fetchTonviewerOgImage(explorerLink) {
  if (!explorerLink || !explorerLink.includes('tonviewer.com')) return null;
  try {
    const res = await fetch(explorerLink, {
      headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function run() {
  const img = await fetchTonviewerOgImage('https://tonviewer.com/transaction/4fb6a7f09faccce35c84e942255b321dc657c1d933c78ad70ef78beee41239fb');
  console.log('SUCCESSFUL EXTRACTED OG IMAGE:', img);
}

run();
