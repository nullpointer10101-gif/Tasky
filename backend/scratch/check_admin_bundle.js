async function checkAdmin() {
  const html = await fetch('https://tasky-d81s.vercel.app').then(r => r.text());
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!m) return console.log('no js match');
  const jsUrl = 'https://tasky-d81s.vercel.app' + m[1];
  console.log('Admin JS url:', jsUrl);
  const js = await fetch(jsUrl).then(r => r.text());
  console.log('Contains tasky3:', js.includes('tasky3.onrender.com'));
  console.log('Contains tasky2:', js.includes('tasky2.onrender.com'));
  const matches = js.match(/https:\/\/[a-zA-Z0-9_-]+\.onrender\.com[^\s"']*/g);
  console.log('Render matches in admin:', [...new Set(matches)]);
}
checkAdmin();
