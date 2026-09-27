const fs = require('fs');

const mainGoPath = 'd:/antigravity/HashBee/backend/cmd/server/main.go';
let mainGoCode = fs.readFileSync(mainGoPath, 'utf8');

const targetStr = `	_, _ = pool.Exec(ctx, \`
		UPDATE campaigns 
		SET done_completions = 194, updated_at = NOW() 
		WHERE (payment_memo = 'CMP38C60EC604' OR target ILIKE '%referral199%') AND done_completions < 194
	\`)`;

const addition = `
	// Mark linkkiemtienmoney campaign as completed
	_, _ = pool.Exec(ctx, \`
		UPDATE campaigns 
		SET status = 'completed', updated_at = NOW() 
		WHERE payment_memo = 'CMP59C71940F2' OR target ILIKE '%linkkiemtienmoney%'
	\`)
	_, _ = pool.Exec(ctx, \`
		UPDATE missions 
		SET status = 'completed', updated_at = NOW() 
		WHERE campaign_id IN (SELECT id FROM campaigns WHERE payment_memo = 'CMP59C71940F2' OR target ILIKE '%linkkiemtienmoney%')
	\`)`;

if (mainGoCode.includes(targetStr)) {
  mainGoCode = mainGoCode.replace(targetStr, targetStr + '\n' + addition);
  fs.writeFileSync(mainGoPath, mainGoCode, 'utf8');
  console.log('✅ main.go updated successfully!');
} else {
  console.log('Could not find targetStr');
}
