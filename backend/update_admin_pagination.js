const fs = require('fs');
const path = require('path');

// 1. Update backend admin_handler.go to allow limit up to 1000
const adminHandlerPath = path.join(__dirname, 'internal/handlers/admin_handler.go');
if (fs.existsSync(adminHandlerPath)) {
  let adminCode = fs.readFileSync(adminHandlerPath, 'utf8');
  adminCode = adminCode.replace(
    'if v, _ := strconv.Atoi(l); v > 0 && v <= 200 {',
    'if v, _ := strconv.Atoi(l); v > 0 && v <= 1000 {'
  );
  fs.writeFileSync(adminHandlerPath, adminCode, 'utf8');
  console.log('✅ Updated admin_handler.go');
}

// 2. Update Admin HTML files
const adminHtmlFiles = [
  path.join(__dirname, '../miniapp/public/admin/index.html'),
  path.join(__dirname, 'public/admin/index.html'),
  path.join(__dirname, 'public/app/admin/index.html'),
];

adminHtmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Update Users Tab HTML with status filter, limit selector, and pagination bar
    const oldUsersTabHTML = `    <!-- TAB: USERS -->
    <div id="tab-users" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h2 style="font-size:20px; font-weight:900;">Platform Users</h2>
        <div style="display:flex; gap:8px;">
          <input type="text" id="userSearch" class="form-input" placeholder="Search Telegram ID, username..." style="width:240px; padding:8px 12px; font-size:12px;" onkeyup="if(event.key==='Enter')loadUsers()">
          <button onclick="loadUsers()" class="btn btn-secondary">🔍 Search</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Telegram ID</th>
              <th>Name & Username</th>
              <th>GHS Power</th>
              <th>Honey Balance</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersBody">
            <tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

    const newUsersTabHTML = `    <!-- TAB: USERS -->
    <div id="tab-users" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <h2 style="font-size:20px; font-weight:900;">Platform Users</h2>
          <span id="usersTotalBadge" class="badge" style="background:#1e2d27; color:#10b981; font-size:12px; font-weight:800;">0 Total</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="userStatusFilter" class="form-input" style="width:130px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select id="userPageSize" class="form-input" style="width:120px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="250">250 / page</option>
            <option value="500">500 / page</option>
          </select>
          <input type="text" id="userSearch" class="form-input" placeholder="Search Telegram ID, username..." style="width:200px; padding:8px 12px; font-size:12px;" onkeyup="if(event.key==='Enter')loadUsers(0)">
          <button onclick="loadUsers(0)" class="btn btn-secondary" style="padding:8px 14px;">🔍 Search</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Telegram ID</th>
              <th>Name & Username</th>
              <th>GHS Power</th>
              <th>Honey Balance</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersBody">
            <tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination Controls -->
      <div id="usersPagination" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding:12px 16px; background:#101714; border:1px solid #1c2b24; border-radius:12px; font-size:12px;">
        <span id="usersPageInfo" style="color:var(--text-muted); font-weight:700;">Showing 0-0 of 0 users</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <button id="usersPrevBtn" onclick="changeUserPage(-1)" class="btn btn-secondary" style="padding:6px 14px; font-size:11px;">◀ Prev</button>
          <span id="usersPageNum" class="font-mono" style="font-weight:800; color:#fff; padding:0 8px;">Page 1 of 1</span>
          <button id="usersNextBtn" onclick="changeUserPage(1)" class="btn btn-secondary" style="padding:6px 14px; font-size:11px;">Next ▶</button>
        </div>
      </div>
    </div>`;

    if (content.includes(oldUsersTabHTML)) {
      content = content.replace(oldUsersTabHTML, newUsersTabHTML);
    }

    // Replace loadUsers JS with full pagination logic
    const oldLoadUsersJS = `// 3. USERS
async function loadUsers() {
  const search = document.getElementById('userSearch').value.trim();
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>';

  try {
    const res = await fetch(API_URL + '/api/admin/users?search=' + encodeURIComponent(search), { headers: authHeaders() });
    const data = await res.json();
    const list = data.users || [];
    tbody.innerHTML = list.map(u => \`
      <tr>
        <td class="font-mono" style="font-weight:700;">\${u.telegram_id}</td>
        <td>
          <div style="font-weight:700;">\${escapeHtml(u.first_name || '')}</div>
          <div class="text-muted" style="font-size:11px;">@\${escapeHtml(u.username || 'none')}</div>
        </td>
        <td style="color:#10b981; font-weight:800;">\${(u.bp || 0).toFixed(2)} GHS</td>
        <td style="color:#f59e0b; font-weight:800;">\${(u.honey_balance || 0).toFixed(4)}</td>
        <td><span class="badge \${u.status === 'banned' ? 'badge-cancelled' : 'badge-active'}">\${u.status}</span></td>
        <td class="font-mono text-muted" style="font-size:11px;">\${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button onclick="adjustUser('\${u.id}')" class="btn btn-secondary" style="padding:6px 10px; font-size:11px;">⚡ Adjust</button>
            <button onclick="toggleUserStatus('\${u.id}', '\${u.status}')" class="btn \${u.status === 'banned' ? 'btn-primary' : 'btn-danger'}" style="padding:6px 10px; font-size:11px;">\${u.status === 'banned' ? 'Unban' : 'Ban'}</button>
          </div>
        </td>
      </tr>
    \`).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error: ' + err.message + '</td></tr>';
  }
}`;

    const newLoadUsersJS = `// 3. USERS (With Full Pagination)
let currentUserOffset = 0;
let totalUsersCount = 0;

function changeUserPage(delta) {
  const limit = parseInt(document.getElementById('userPageSize')?.value || '50');
  const newOffset = currentUserOffset + (delta * limit);
  if (newOffset >= 0 && newOffset < totalUsersCount) {
    loadUsers(newOffset);
  }
}

async function loadUsers(offset = 0) {
  currentUserOffset = offset;
  const search = document.getElementById('userSearch')?.value.trim() || '';
  const status = document.getElementById('userStatusFilter')?.value || '';
  const limit = parseInt(document.getElementById('userPageSize')?.value || '50');
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>';

  try {
    const url = API_URL + '/api/admin/users?search=' + encodeURIComponent(search) + '&status=' + encodeURIComponent(status) + '&limit=' + limit + '&offset=' + offset;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json();
    const list = data.users || [];
    totalUsersCount = data.total !== undefined ? data.total : list.length;

    // Update total badge
    const badge = document.getElementById('usersTotalBadge');
    if (badge) badge.innerText = totalUsersCount + ' Total';

    // Update pagination controls
    const from = totalUsersCount > 0 ? offset + 1 : 0;
    const to = Math.min(offset + list.length, totalUsersCount);
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(totalUsersCount / limit));

    const pageInfo = document.getElementById('usersPageInfo');
    if (pageInfo) pageInfo.innerText = \`Showing \${from} - \${to} of \${totalUsersCount} users\`;

    const pageNum = document.getElementById('usersPageNum');
    if (pageNum) pageNum.innerText = \`Page \${currentPage} of \${totalPages}\`;

    const prevBtn = document.getElementById('usersPrevBtn');
    if (prevBtn) prevBtn.disabled = offset === 0;

    const nextBtn = document.getElementById('usersNextBtn');
    if (nextBtn) nextBtn.disabled = to >= totalUsersCount;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(u => \`
      <tr>
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
      </tr>
    \`).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error: ' + err.message + '</td></tr>';
  }
}`;

    if (content.includes(oldLoadUsersJS)) {
      content = content.replace(oldLoadUsersJS, newLoadUsersJS);
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Successfully updated:', file);
  }
});
