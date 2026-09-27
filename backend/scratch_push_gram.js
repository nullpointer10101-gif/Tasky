const { execSync } = require('child_process');

try {
  execSync('git add -A', { cwd: 'd:/antigravity/HashBee', stdio: 'inherit' });
  execSync('git commit -m "feat: GRAM deposits only on TON wallet UQAehBZqsy6cBGSmVn2qquO5b44ckmTnhmT9K0LKcfsygGpO with auto-watcher, min dep 0.1, min with 0.05, min claim 0.01"', { cwd: 'd:/antigravity/HashBee', stdio: 'inherit' });
  const pushOut = execSync('git push origin main', { cwd: 'd:/antigravity/HashBee' });
  console.log('Push output:', pushOut.toString());
} catch (e) {
  console.error('Error during git push:', e.message);
}
  
