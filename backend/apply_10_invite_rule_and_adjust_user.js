const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update referral_service.go to add CountTotalReferrals
const refSvcPath = path.join(hashbeeDir, 'backend/internal/services/referral_service.go');
let refCode = fs.readFileSync(refSvcPath, 'utf8');

if (!refCode.includes('CountTotalReferrals')) {
  const funcToAdd = `
// CountTotalReferrals returns the count of all L1 referrals (pending or active) for a user
func (s *ReferralService) CountTotalReferrals(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRow(ctx,
		\`SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND level = 1\`,
		userID).Scan(&count)
	return count, err
}
`;
  refCode += funcToAdd;
  fs.writeFileSync(refSvcPath, refCode, 'utf8');
  console.log('✅ Added CountTotalReferrals to referral_service.go');
} else {
  console.log('ℹ️ CountTotalReferrals already present');
}

// 2. Update mission_service.go
const misSvcPath = path.join(hashbeeDir, 'backend/internal/services/mission_service.go');
let misCode = fs.readFileSync(misSvcPath, 'utf8');

// Update ListMissionsForUser progress calculation
const oldListPattern = `		if m.Type == models.MissionTypeMilestone && m.MilestoneCount != nil {
			count, _ := s.referral.CountActiveReferrals(ctx, userID)
			progress := count
			if progress > *m.MilestoneCount {
				progress = *m.MilestoneCount
			}
			m.Progress = &progress
		}`;

const newListCode = `		if m.Type == models.MissionTypeMilestone && m.MilestoneCount != nil {
			var count int
			if *m.MilestoneCount <= 10 {
				count, _ = s.referral.CountTotalReferrals(ctx, userID)
			} else {
				count, _ = s.referral.CountActiveReferrals(ctx, userID)
			}
			progress := count
			if progress > *m.MilestoneCount {
				progress = *m.MilestoneCount
			}
			m.Progress = &progress
		}`;

if (misCode.includes(oldListPattern)) {
  misCode = misCode.replace(oldListPattern, newListCode);
  console.log('✅ Updated ListMissionsForUser milestone progress');
}

// Update ClaimMilestoneMission qualification check
const oldClaimPattern = `	activeCount, err := s.referral.CountActiveReferrals(ctx, userID)
	if err != nil {
		return 0, err
	}

	if m.MilestoneCount != nil && activeCount < *m.MilestoneCount {
		return 0, fmt.Errorf("not enough active referrals: have %d, need %d", activeCount, *m.MilestoneCount)
	}`;

const newClaimCode = `	var count int
	if m.MilestoneCount != nil && *m.MilestoneCount <= 10 {
		count, err = s.referral.CountTotalReferrals(ctx, userID)
	} else {
		count, err = s.referral.CountActiveReferrals(ctx, userID)
	}
	if err != nil {
		return 0, err
	}

	if m.MilestoneCount != nil && count < *m.MilestoneCount {
		if *m.MilestoneCount <= 10 {
			return 0, fmt.Errorf("not enough referrals: have %d, need %d", count, *m.MilestoneCount)
		}
		return 0, fmt.Errorf("not enough active referrals: have %d, need %d", count, *m.MilestoneCount)
	}`;

if (misCode.includes(oldClaimPattern)) {
  misCode = misCode.replace(oldClaimPattern, newClaimCode);
  console.log('✅ Updated ClaimMilestoneMission tier qualification check');
}

fs.writeFileSync(misSvcPath, misCode, 'utf8');

// 3. Update User 7564592986 BP to 139.80 in Database
async function adjustUser() {
  const client = new Client({
    connectionString: 'postgresql://postgres:YoLOuZ5vrGUq3nrk@db.fniclcuywsrohisxgvcm.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const tgId = 7564592986;
  const newBp = 139.80;

  const res = await client.query('SELECT id, telegram_id, username, first_name, bp FROM users WHERE telegram_id = $1', [tgId]);
  if (res.rows.length > 0) {
    const u = res.rows[0];
    const oldBp = parseFloat(u.bp);
    await client.query('UPDATE users SET bp = $1, updated_at = NOW() WHERE telegram_id = $2', [newBp, tgId]);
    console.log(`✅ User ${tgId} (${u.username || u.first_name}) BP adjusted from ${oldBp} -> ${newBp} GHS`);
  }

  await client.end();
}

adjustUser().catch(console.error);
