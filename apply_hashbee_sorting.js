const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update models.go
const modelsPath = path.join(hashbeeDir, 'backend/internal/models/models.go');
let modelsCode = fs.readFileSync(modelsPath, 'utf8');
if (!modelsCode.includes('ReferralCount')) {
  modelsCode = modelsCode.replace(
    'ReferrerID            *uuid.UUID `json:"referrer_id,omitempty" db:"referrer_id"`\n\tBP',
    'ReferrerID            *uuid.UUID `json:"referrer_id,omitempty" db:"referrer_id"`\n\tReferralCount         int        `json:"referral_count"`\n\tBP'
  );
  fs.writeFileSync(modelsPath, modelsCode, 'utf8');
  console.log('✅ Updated models.go with ReferralCount');
}

// 2. Update user_service.go AdminGetUsers
const userSvcPath = path.join(hashbeeDir, 'backend/internal/services/user_service.go');
let userSvcCode = fs.readFileSync(userSvcPath, 'utf8');

const newAdminGetUsers = `// AdminGetUsers returns paginated users for admin panel with dynamic sorting
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
		orderClause = "referral_count DESC, u.created_at DESC"
	default:
		orderClause = "u.created_at DESC"
	}

	args = append(args, limit, offset)
	query := fmt.Sprintf(\`SELECT u.id, u.telegram_id, u.username, u.first_name, u.language, u.referrer_id, u.bp, u.honey_balance,
		        u.last_collect_at, u.streak_count, u.last_checkin_at, u.status, u.has_collected,
		        u.has_completed_mission, u.last_hive_full_notified_at, u.opted_out_notifications, u.created_at, u.updated_at,
		        COALESCE((SELECT COUNT(*) FROM users r WHERE r.referrer_id = u.id), 0) AS referral_count
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

// Replace AdminGetUsers function in user_service.go
const adminGetUsersRegex = /\/\/ AdminGetUsers returns paginated users for admin panel[\s\S]*?return users, total, nil\s*\}/;
userSvcCode = userSvcCode.replace(adminGetUsersRegex, newAdminGetUsers);
fs.writeFileSync(userSvcPath, userSvcCode, 'utf8');
console.log('✅ Updated user_service.go AdminGetUsers');

// 3. Update admin_handler.go ListUsers
const adminHandlerPath = path.join(hashbeeDir, 'backend/internal/handlers/admin_handler.go');
let adminHandlerCode = fs.readFileSync(adminHandlerPath, 'utf8');

adminHandlerCode = adminHandlerCode.replace(
  `func (h *AdminHandler) ListUsers(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")`,
  `func (h *AdminHandler) ListUsers(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")
	sort := c.Query("sort")`
);

adminHandlerCode = adminHandlerCode.replace(
  `users, total, err := h.userSvc.AdminGetUsers(c.Request.Context(), search, status, limit, offset)`,
  `users, total, err := h.userSvc.AdminGetUsers(c.Request.Context(), search, status, sort, limit, offset)`
);

fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
console.log('✅ Updated admin_handler.go ListUsers');

// 4. Update Admin HTML files
const adminHtmlFiles = [
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html'),
];

adminHtmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');

    // Replace the Users tab UI header controls
    const oldUsersHeader = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="userStatusFilter" class="form-input" style="width:130px; padding:8px 10px; font-size:12px;" onchange="loadUsers(0)">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select id="userPageSize" class="form-input" style="width:120px; padding:8px 10px; font-size:12px;" onchange="loadUsers(0)">
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="250">250 / page</option>
            <option value="500">500 / page</option>
          </select>
          <input type="text" id="userSearch" class="form-input" placeholder="Search Telegram ID, username..." style="width:200px; padding:8px 12px; font-size:12px;" onkeyup="if(event.key==='Enter')loadUsers(0)">
          <button onclick="loadUsers(0)" class="btn btn-secondary" style="padding:8px 14px;">🔍 Search</button>
        </div>`;

    const newUsersHeader = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="userSortFilter" class="form-input" style="width:160px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="created_desc">🕒 Newest First</option>
            <option value="created_asc">⏳ Oldest First</option>
            <option value="ghs_desc">⚡ Most GHS Power</option>
            <option value="ghs_asc">🔋 Least GHS Power</option>
            <option value="referrals_desc">👥 Most Referrals</option>
            <option value="balance_desc">🍯 Most Honey</option>
          </select>
          <select id="userStatusFilter" class="form-input" style="width:120px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select id="userPageSize" class="form-input" style="width:110px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="250">250 / page</option>
            <option value="500">500 / page</option>
          </select>
          <input type="text" id="userSearch" class="form-input" placeholder="Search Telegram ID, username..." style="width:190px; padding:8px 12px; font-size:12px;" onkeyup="if(event.key==='Enter')loadUsers(0)">
          <button onclick="loadUsers(0)" class="btn btn-secondary" style="padding:8px 14px;">🔍 Search</button>
        </div>`;

    if (html.includes(oldUsersHeader)) {
      html = html.replace(oldUsersHeader, newUsersHeader);
    }

    // Update table header to include Referrals
    const oldTableHeader = `            <tr>
              <th>Telegram ID</th>
              <th>Name & Username</th>
              <th>GHS Power</th>
              <th>Honey Balance</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>`;

    const newTableHeader = `            <tr>
              <th>Telegram ID</th>
              <th>Name & Username</th>
              <th>GHS Power</th>
              <th>Referrals</th>
              <th>Honey Balance</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>`;

    if (html.includes(oldTableHeader)) {
      html = html.replace(oldTableHeader, newTableHeader);
      html = html.replace(/colspan="7"/g, 'colspan="8"');
    }

    // Update loadUsers JS to send sort parameter and render Referrals
    const oldLoadUsersStart = `async function loadUsers(offset = 0) {
  currentUserOffset = offset;
  const search = document.getElementById('userSearch')?.value.trim() || '';
  const status = document.getElementById('userStatusFilter')?.value || '';
  const limit = parseInt(document.getElementById('userPageSize')?.value || '50');
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>';

  try {
    const url = API_URL + '/api/admin/users?search=' + encodeURIComponent(search) + '&status=' + encodeURIComponent(status) + '&limit=' + limit + '&offset=' + offset;`;

    const newLoadUsersStart = `async function loadUsers(offset = 0) {
  currentUserOffset = offset;
  const search = document.getElementById('userSearch')?.value.trim() || '';
  const status = document.getElementById('userStatusFilter')?.value || '';
  const sort = document.getElementById('userSortFilter')?.value || 'created_desc';
  const limit = parseInt(document.getElementById('userPageSize')?.value || '50');
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>';

  try {
    const url = API_URL + '/api/admin/users?search=' + encodeURIComponent(search) + '&status=' + encodeURIComponent(status) + '&sort=' + encodeURIComponent(sort) + '&limit=' + limit + '&offset=' + offset;`;

    if (html.includes(oldLoadUsersStart)) {
      html = html.replace(oldLoadUsersStart, newLoadUsersStart);
    }

    const oldRowTemplate = `      <tr>
        <td class="font-mono" style="font-weight:700;">\${u.telegram_id}</td>
        <td>
          <div style="font-weight:700;">\${escapeHtml(u.first_name || '')}</div>
          <div class="text-muted" style="font-size:11px;">@\${escapeHtml(u.username || 'none')}</div>
        </td>
        <td style="color:#10b981; font-weight:800;">\${(u.bp || 0).toFixed(2)} GHS</td>
        <td style="color:#f59e0b; font-weight:800;">\${(u.honey_balance || 0).toFixed(4)}</td>
        <td><span class="badge \${u.status === 'banned' ? 'badge-cancelled' : 'badge-active'}">\${u.status}</span></td>
        <td class="font-mono text-muted" style="font-size:11px;">\${new Date(u.created_at).toLocaleString()}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button onclick="adjustUser('\${u.id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:11px;">⚡ Adjust</button>
            <button onclick="toggleUserStatus('\${u.id}', '\${u.status}')" class="btn \${u.status === 'banned' ? 'btn-primary' : 'btn-danger'}" style="padding:6px 10px; font-size:11px;">\${u.status === 'banned' ? 'Unban' : 'Ban'}</button>
          </div>
        </td>
      </tr>`;

    const newRowTemplate = `      <tr>
        <td class="font-mono" style="font-weight:700;">\${u.telegram_id}</td>
        <td>
          <div style="font-weight:700;">\${escapeHtml(u.first_name || '')}</div>
          <div class="text-muted" style="font-size:11px;">@\${escapeHtml(u.username || 'none')}</div>
        </td>
        <td style="color:#10b981; font-weight:800;">\${(u.bp || 0).toFixed(2)} GHS</td>
        <td style="color:#38bdf8; font-weight:800;"><span class="badge" style="background:#0c2233; color:#38bdf8; border:1px solid #1e3a5f;">👥 \${u.referral_count || 0}</span></td>
        <td style="color:#f59e0b; font-weight:800;">\${(u.honey_balance || 0).toFixed(4)}</td>
        <td><span class="badge \${u.status === 'banned' ? 'badge-cancelled' : 'badge-active'}">\${u.status}</span></td>
        <td class="font-mono text-muted" style="font-size:11px;">\${new Date(u.created_at).toLocaleString()}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button onclick="adjustUser('\${u.id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:11px;">⚡ Adjust</button>
            <button onclick="toggleUserStatus('\${u.id}', '\${u.status}')" class="btn \${u.status === 'banned' ? 'btn-primary' : 'btn-danger'}" style="padding:6px 10px; font-size:11px;">\${u.status === 'banned' ? 'Unban' : 'Ban'}</button>
          </div>
        </td>
      </tr>`;

    if (html.includes(oldRowTemplate)) {
      html = html.replace(oldRowTemplate, newRowTemplate);
    }

    fs.writeFileSync(file, html, 'utf8');
    console.log('✅ Updated HTML file:', file);
  }
});
