const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

const adminHtmlFiles = [
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html'),
];

adminHtmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Make sure header has userSortFilter
    if (!content.includes('id="userSortFilter"')) {
      const oldHeader = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="userStatusFilter"`;
      const newHeader = `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select id="userSortFilter" class="form-input" style="width:160px; padding:8px 10px; font-size:12px; background:#0f1714; color:#fff; border:1px solid #1c2b24;" onchange="loadUsers(0)">
            <option value="created_desc">🕒 Newest First</option>
            <option value="created_asc">⏳ Oldest First</option>
            <option value="ghs_desc">⚡ Most GHS Power</option>
            <option value="ghs_asc">🔋 Least GHS Power</option>
            <option value="referrals_desc">👥 Most Referrals</option>
            <option value="balance_desc">🍯 Most Honey</option>
          </select>
          <select id="userStatusFilter"`;
      content = content.replace(oldHeader, newHeader);
    }

    // Replace the loadUsers JS block
    const userBlockRegex = /\/\/ 3\. USERS[\s\S]*?async function adjustUser/;
    const newUserBlock = `// 3. USERS (With Full Database-Wide Pagination & Sorting)
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
  const sort = document.getElementById('userSortFilter')?.value || 'created_desc';
  const limit = parseInt(document.getElementById('userPageSize')?.value || '50');
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">Loading users...</td></tr>';

  try {
    const url = API_URL + '/api/admin/users?search=' + encodeURIComponent(search) + '&status=' + encodeURIComponent(status) + '&sort=' + encodeURIComponent(sort) + '&limit=' + limit + '&offset=' + offset;
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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:30px;">No users found.</td></tr>';
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
      </tr>
    \`).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#ef4444;">Error: ' + err.message + '</td></tr>';
  }
}

async function adjustUser`;

    content = content.replace(userBlockRegex, newUserBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Updated sort and loadUsers in:', file);
  }
});
