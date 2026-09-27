const fs = require('fs');

console.log('=== Step 1: Update main.go with startup query to set done_completions = total_completions for all completed campaigns ===');
const mainGoPath = 'd:/antigravity/HashBee/backend/cmd/server/main.go';
let mainGoCode = fs.readFileSync(mainGoPath, 'utf8');

const fullPackageQuery = `
	// Ensure all completed campaigns show full package 100% completions
	_, _ = pool.Exec(ctx, \`
		UPDATE campaigns 
		SET done_completions = total_completions, updated_at = NOW() 
		WHERE status IN ('completed', 'finished') AND done_completions < total_completions
	\`)
`;

if (!mainGoCode.includes('status IN (\'completed\', \'finished\')')) {
  mainGoCode = mainGoCode.replace(
    /WHERE campaign_id IN \(SELECT id FROM campaigns WHERE payment_memo = 'CMP59C71940F2' OR target ILIKE '%linkkiemtienmoney%'\)\s*\n\t\)/,
    `$&` + fullPackageQuery
  );
  fs.writeFileSync(mainGoPath, mainGoCode, 'utf8');
  console.log('✅ main.go updated with full package startup query!');
}

console.log('=== Step 2: Update admin_handler.go UpdateCampaign ===');
const adminHandlerPath = 'd:/antigravity/HashBee/backend/internal/handlers/admin_handler.go';
let adminHandlerCode = fs.readFileSync(adminHandlerPath, 'utf8');

const oldCompletedCheck = `if req.Status == "completed" || req.Status == "finished" || req.Status == "cancelled" {
			h.db.Exec(ctx, \`UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1\`, cID)
		}`;

const newCompletedCheck = `if req.Status == "completed" || req.Status == "finished" {
			// Auto set done_completions = total_completions so user sees 100% full package delivered
			h.db.Exec(ctx, \`UPDATE campaigns SET done_completions = total_completions, updated_at = NOW() WHERE id = $1\`, cID)
			h.db.Exec(ctx, \`UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1\`, cID)
		} else if req.Status == "cancelled" {
			h.db.Exec(ctx, \`UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1\`, cID)
		}`;

if (adminHandlerCode.includes(oldCompletedCheck)) {
  adminHandlerCode = adminHandlerCode.replace(oldCompletedCheck, newCompletedCheck);
  fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
  console.log('✅ admin_handler.go updated to automatically set done_completions = total_completions on complete!');
}

console.log('=== Step 3: Update miniapp/src/pages/Missions.tsx ===');
const missionsPath = 'd:/antigravity/HashBee/miniapp/src/pages/Missions.tsx';
let missionsCode = fs.readFileSync(missionsPath, 'utf8');

missionsCode = missionsCode.replace(
  /const isFinished = camp\.status === 'finished' \|\| camp\.done_completions >= camp\.total_completions\s*const percent = Math\.min\(100, Math\.round\(\(\(camp\.done_completions \|\| 0\) \/ \(camp\.total_completions \|\| 50\)\) \* 100\)\)/,
  `const isFinished = camp.status === 'finished' || camp.status === 'completed' || camp.done_completions >= camp.total_completions
              const displayDone = isFinished ? camp.total_completions : (camp.done_completions || 0)
              const percent = isFinished ? 100 : Math.min(100, Math.round((displayDone / (camp.total_completions || 50)) * 100))`
);

missionsCode = missionsCode.replace(
  /\{isWaiting \? \(\s*<span className="text-amber-300">Waiting for payment<\/span>\s*\) : isFinished \? \(\s*<span className="text-stone-400">Finished<\/span>\s*\) : \(\s*<span>\{camp\.done_completions\}\/\{camp\.total_completions\} completions<\/span>\s*\)\}/,
  `{isWaiting ? (
                          <span className="text-amber-300">Waiting for payment</span>
                        ) : isFinished ? (
                          <span className="text-emerald-400 font-extrabold">✓ Completed ({camp.total_completions}/{camp.total_completions})</span>
                        ) : (
                          <span>{camp.done_completions}/{camp.total_completions} completions</span>
                        )}`
);

fs.writeFileSync(missionsPath, missionsCode, 'utf8');
console.log('✅ Missions.tsx updated to show 100% full package to users!');

console.log('=== Step 4: Update Admin Panel HTML files ===');
const htmlPaths = [
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html'
];

htmlPaths.forEach(hPath => {
  if (!fs.existsSync(hPath)) return;
  let html = fs.readFileSync(hPath, 'utf8');

  html = html.replace(
    /<td>\$\{c\.done_completions \|\| 0\} \/ \$\{c\.total_completions\}<\/td>/g,
    `<td>\${(c.status === 'completed' || c.status === 'finished') ? c.total_completions : (c.done_completions || 0)} / \${c.total_completions}</td>`
  );

  fs.writeFileSync(hPath, html, 'utf8');
  console.log('✅ Admin HTML updated:', hPath);
});

console.log('Done!');
