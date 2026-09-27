const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// Update user_service.go AdminGetUsers with robust referral subquery
const userSvcPath = path.join(hashbeeDir, 'backend/internal/services/user_service.go');
let userSvcCode = fs.readFileSync(userSvcPath, 'utf8');

const newAdminGetUsers = `// AdminGetUsers returns paginated users for admin panel with dynamic sorting across entire database
func (s *UserService) AdminGetUsers(ctx context.Context, search string, status string, sortBy string, limit, offset int) ([]models.User, int, error) {
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		whereClause += fmt.Sprintf(" AND (u.username ILIKE $%d OR u.first_name ILIKE $%d OR CAST(u.telegram_id AS TEXT) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if status != "" {
		whereClause += fmt.Sprintf(" AND u.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int
	err := s.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM users u %s", whereClause), args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	orderClause := "u.created_at DESC"
	switch sortBy {
	case "created_asc":
		orderClause = "u.created_at ASC"
	case "ghs_desc":
		orderClause = "u.bp DESC, u.created_at DESC"
	case "ghs_asc":
		orderClause = "u.bp ASC, u.created_at DESC"
	case "balance_desc":
		orderClause = "u.honey_balance DESC, u.created_at DESC"
	case "referrals_desc":
		orderClause = "referral_count DESC, u.bp DESC, u.created_at DESC"
	default:
		orderClause = "u.created_at DESC"
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(\`SELECT u.id, u.telegram_id, u.username, u.first_name, u.language, u.referrer_id, u.bp, u.honey_balance,
		        u.last_collect_at, u.streak_count, u.last_checkin_at, u.status, u.has_collected,
		        u.has_completed_mission, u.last_hive_full_notified_at, u.opted_out_notifications, u.created_at, u.updated_at,
		        COALESCE(GREATEST(
		            (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.level = 1),
		            (SELECT COUNT(*) FROM users r2 WHERE r2.referrer_id = u.id)
		        ), 0) AS referral_count
		 FROM users u %s ORDER BY %s LIMIT $%d OFFSET $%d\`, whereClause, orderClause, argIdx, argIdx+1)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.TelegramID, &u.Username, &u.FirstName, &u.Language, &u.ReferrerID,
			&u.BP, &u.HoneyBalance, &u.LastCollectAt, &u.StreakCount, &u.LastCheckinAt,
			&u.Status, &u.HasCollected, &u.HasCompletedMission, &u.LastHiveFullNotifiedAt,
			&u.OptedOutNotifications, &u.CreatedAt, &u.UpdatedAt, &u.ReferralCount); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}`;

const adminGetUsersRegex = /\/\/ AdminGetUsers returns paginated users for admin panel[\s\S]*?return users, total, nil\s*\}/;
userSvcCode = userSvcCode.replace(adminGetUsersRegex, newAdminGetUsers);
fs.writeFileSync(userSvcPath, userSvcCode, 'utf8');
console.log('✅ Updated user_service.go AdminGetUsers with greatest referral calculation');
