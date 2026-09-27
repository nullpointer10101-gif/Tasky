const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update bot.go with CheckChatMember
const botPath = path.join(hashbeeDir, 'backend/internal/bot/bot.go');
let botCode = fs.readFileSync(botPath, 'utf8');

if (!botCode.includes('CheckChatMember')) {
  const checkChatMemberFunc = `
// CheckChatMember checks if a user is currently a member of a channel/group
func (b *Bot) CheckChatMember(chatUsername string, telegramID int64) (bool, error) {
	if b == nil || b.api == nil {
		return true, nil
	}

	chatUsername = strings.TrimSpace(chatUsername)
	if chatUsername == "" {
		return true, nil
	}

	if !strings.HasPrefix(chatUsername, "@") && !strings.HasPrefix(chatUsername, "-") {
		chatUsername = "@" + chatUsername
	}

	conf := tgbotapi.GetChatMemberConfig{
		ChatConfigWithUser: tgbotapi.ChatConfigWithUser{
			SuperGroupUsername: chatUsername,
			UserID:             telegramID,
		},
	}

	member, err := b.api.GetChatMember(conf)
	if err != nil {
		return false, err
	}

	status := strings.ToLower(member.Status)
	if status == "member" || status == "administrator" || status == "creator" || status == "restricted" {
		return true, nil
	}

	return false, nil
}
`;
  botCode += checkChatMemberFunc;
  fs.writeFileSync(botPath, botCode, 'utf8');
  console.log('✅ Added CheckChatMember to bot.go');
} else {
  console.log('ℹ️ CheckChatMember already exists in bot.go');
}

// 2. Update mission_service.go
const misSvcPath = path.join(hashbeeDir, 'backend/internal/services/mission_service.go');
let misCode = fs.readFileSync(misSvcPath, 'utf8');

// Add MissionChatVerifier interface and SetBot if not present
if (!misCode.includes('MissionChatVerifier')) {
  misCode = misCode.replace(
    'type MissionService struct {\n\tdb       *pgxpool.Pool\n\tsettings *SettingsService\n\treferral *ReferralService\n}',
    `type MissionChatVerifier interface {
	CheckChatMember(chatUsername string, telegramID int64) (bool, error)
}

type MissionService struct {
	db       *pgxpool.Pool
	settings *SettingsService
	referral *ReferralService
	verifier MissionChatVerifier
}

func (s *MissionService) SetBot(verifier MissionChatVerifier) {
	s.verifier = verifier
}`
  );
  console.log('✅ Added MissionChatVerifier interface to mission_service.go');
}

// Add extractTelegramChat helper function if not present
if (!misCode.includes('func extractTelegramChat')) {
  const helperFunc = `
func extractTelegramChat(target string) string {
	target = strings.TrimSpace(target)
	target = strings.TrimPrefix(target, "https://")
	target = strings.TrimPrefix(target, "http://")
	target = strings.TrimPrefix(target, "t.me/")
	target = strings.TrimPrefix(target, "telegram.me/")
	target = strings.TrimPrefix(target, "@")
	if idx := strings.Index(target, "?"); idx != -1 {
		target = target[:idx]
	}
	if idx := strings.Index(target, "/"); idx != -1 {
		target = target[:idx]
	}
	return strings.TrimSpace(target)
}
`;
  misCode += helperFunc;
  console.log('✅ Added extractTelegramChat helper function');
}

// Ensure strings package is imported in mission_service.go
if (!misCode.includes('"strings"')) {
  misCode = misCode.replace(
    'import (',
    'import (\n\t"strings"'
  );
  console.log('✅ Added strings import to mission_service.go');
}

// Update VerifyMission to query target and verify chat membership
const oldVerifyQuery = `	// Get mission + completion with lock
	var m models.Mission
	var mc models.MissionCompletion
	err = tx.QueryRow(ctx,
		\`SELECT m.id, m.type, m.reward_bp, m.campaign_id, m.status,
		        mc.id, mc.status, mc.created_at
		 FROM missions m
		 JOIN mission_completions mc ON mc.mission_id = m.id
		 WHERE mc.user_id = $1 AND mc.mission_id = $2
		 FOR UPDATE OF mc\`,
		userID, missionID).Scan(
		&m.ID, &m.Type, &m.RewardBP, &m.CampaignID, &m.Status,
		&mc.ID, &mc.Status, &mc.CreatedAt)`;

const newVerifyQuery = `	// Get mission + completion with lock
	var m models.Mission
	var mc models.MissionCompletion
	err = tx.QueryRow(ctx,
		\`SELECT m.id, m.type, m.target, m.reward_bp, m.campaign_id, m.status,
		        mc.id, mc.status, mc.created_at
		 FROM missions m
		 JOIN mission_completions mc ON mc.mission_id = m.id
		 WHERE mc.user_id = $1 AND mc.mission_id = $2
		 FOR UPDATE OF mc\`,
		userID, missionID).Scan(
		&m.ID, &m.Type, &m.Target, &m.RewardBP, &m.CampaignID, &m.Status,
		&mc.ID, &mc.Status, &mc.CreatedAt)`;

if (misCode.includes(oldVerifyQuery)) {
  misCode = misCode.replace(oldVerifyQuery, newVerifyQuery);
  console.log('✅ Updated VerifyMission query to scan target');
}

const oldTimerCheck = `	// Timer-based: ensure minimum time has passed
	timerSeconds := s.settings.GetInt(ctx, "mission_timer_seconds", 15)
	if m.Type == models.MissionTypeLink || m.Type == models.MissionTypeBot {
		elapsed := time.Since(mc.CreatedAt).Seconds()
		if elapsed < float64(timerSeconds) {
			return 0, fmt.Errorf("please wait %d seconds before verifying", timerSeconds)
		}
	}`;

const newTimerAndMembershipCheck = `	// Real-time Telegram Channel / Group membership verification
	if (m.Type == models.MissionTypeChannel || m.Type == models.MissionTypeGroup) && s.verifier != nil {
		channel := extractTelegramChat(m.Target)
		if channel != "" {
			var telegramID int64
			_ = tx.QueryRow(ctx, \`SELECT telegram_id FROM users WHERE id = $1\`, userID).Scan(&telegramID)
			if telegramID != 0 {
				isMember, err := s.verifier.CheckChatMember(channel, telegramID)
				if err == nil && !isMember {
					return 0, fmt.Errorf("you have not joined @%s yet. Please join the channel first!", channel)
				}
				if err != nil {
					errStr := strings.ToLower(err.Error())
					if strings.Contains(errStr, "user not found") || strings.Contains(errStr, "participant") || strings.Contains(errStr, "member not found") || strings.Contains(errStr, "user_not_participant") {
						return 0, fmt.Errorf("you have not joined @%s yet. Please join the channel first!", channel)
					}
				}
			}
		}
	}

	// Timer-based: ensure minimum time has passed
	timerSeconds := s.settings.GetInt(ctx, "mission_timer_seconds", 15)
	if m.Type == models.MissionTypeLink || m.Type == models.MissionTypeBot {
		elapsed := time.Since(mc.CreatedAt).Seconds()
		if elapsed < float64(timerSeconds) {
			return 0, fmt.Errorf("please wait %d seconds before verifying", timerSeconds)
		}
	}`;

if (misCode.includes(oldTimerCheck)) {
  misCode = misCode.replace(oldTimerCheck, newTimerAndMembershipCheck);
  console.log('✅ Added strict chat membership check to VerifyMission');
}

fs.writeFileSync(misSvcPath, misCode, 'utf8');

// 3. Update main.go to wire missionSvc.SetBot(tgBot)
const mainPath = path.join(hashbeeDir, 'backend/cmd/server/main.go');
let mainCode = fs.readFileSync(mainPath, 'utf8');

if (!mainCode.includes('missionSvc.SetBot(tgBot)')) {
  mainCode = mainCode.replace(
    'referralSvc.SetBot(tgBot)',
    'referralSvc.SetBot(tgBot)\n\t\tmissionSvc.SetBot(tgBot)'
  );
  fs.writeFileSync(mainPath, mainCode, 'utf8');
  console.log('✅ Wired missionSvc.SetBot(tgBot) in main.go');
} else {
  console.log('ℹ️ missionSvc.SetBot(tgBot) already present in main.go');
}
