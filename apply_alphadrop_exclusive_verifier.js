const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';
const misSvcPath = path.join(hashbeeDir, 'backend/internal/services/mission_service.go');

let code = fs.readFileSync(misSvcPath, 'utf8');

const oldCheck = `	// Real-time Telegram Channel / Group membership verification
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
	}`;

const newCheck = `	// Real-time Telegram verification: strictly enforced on official channel (AlphaDropDaily)
	if (m.Type == models.MissionTypeChannel || m.Type == models.MissionTypeGroup) && s.verifier != nil {
		channel := extractTelegramChat(m.Target)
		if strings.EqualFold(channel, "AlphaDropDaily") {
			var telegramID int64
			_ = tx.QueryRow(ctx, \`SELECT telegram_id FROM users WHERE id = $1\`, userID).Scan(&telegramID)
			if telegramID != 0 {
				isMember, err := s.verifier.CheckChatMember(channel, telegramID)
				if err == nil && !isMember {
					return 0, fmt.Errorf("you have not joined @%s yet. Please join the channel first!", channel)
				}
				if err != nil {
					errStr := strings.ToLower(err.Error())
					if strings.Contains(errStr, "user not found") || strings.Contains(errStr, "user_not_participant") {
						return 0, fmt.Errorf("you have not joined @%s yet. Please join the channel first!", channel)
					}
					// If bot is not admin or any other API error, allow reward directly
				}
			}
		}
	}`;

if (code.includes(oldCheck)) {
  code = code.replace(oldCheck, newCheck);
  fs.writeFileSync(misSvcPath, code, 'utf8');
  console.log('✅ Updated mission_service.go: verification restricted to AlphaDropDaily, and non-admin channels give rewards directly');
} else {
  console.log('ℹ️ Pattern not found in mission_service.go');
}
