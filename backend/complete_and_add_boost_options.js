const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Step 1: Update admin_handler.go ===');
const adminHandlerPath = 'd:/antigravity/HashBee/backend/internal/handlers/admin_handler.go';
let adminHandlerCode = fs.readFileSync(adminHandlerPath, 'utf8');

const oldUpdateCampaign = `// PATCH /api/admin/campaigns/:id
func (h *AdminHandler) UpdateCampaign(c *gin.Context) {
	cID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req struct {
		Status     string \`json:"status"\`
		AdminNotes string \`json:"admin_notes"\`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	h.db.Exec(ctx,
		\`UPDATE campaigns SET status = COALESCE(NULLIF($1,''), status), admin_notes = $2, updated_at = NOW() WHERE id = $3\`,
		req.Status, req.AdminNotes, cID)

	// If approved, create mission
	if req.Status == "active" {
		var c2 models.Campaign
		h.db.QueryRow(ctx,
			\`SELECT id, type, target, title, reward_bp FROM campaigns WHERE id = $1\`, cID).
			Scan(&c2.ID, &c2.Type, &c2.Target, &c2.Title, &c2.RewardBP)

		h.db.Exec(ctx,
			\`INSERT INTO missions (id, type, target, title, reward_bp, campaign_id, sort_order, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', NOW(), NOW())
			 ON CONFLICT DO NOTHING\`,
			uuid.New(), c2.Type, c2.Target, c2.Title, c2.RewardBP, c2.ID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign updated"})
}`;

const newUpdateCampaign = `// PATCH /api/admin/campaigns/:id
func (h *AdminHandler) UpdateCampaign(c *gin.Context) {
	cID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req struct {
		Status           string \`json:"status"\`
		AdminNotes       string \`json:"admin_notes"\`
		DoneCompletions  *int   \`json:"done_completions"\`
		TotalCompletions *int   \`json:"total_completions"\`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	if req.DoneCompletions != nil {
		h.db.Exec(ctx, \`UPDATE campaigns SET done_completions = $1, updated_at = NOW() WHERE id = $2\`, *req.DoneCompletions, cID)
	}
	if req.TotalCompletions != nil {
		h.db.Exec(ctx, \`UPDATE campaigns SET total_completions = $1, updated_at = NOW() WHERE id = $2\`, *req.TotalCompletions, cID)
	}

	if req.Status != "" {
		h.db.Exec(ctx,
			\`UPDATE campaigns SET status = $1, admin_notes = COALESCE(NULLIF($2,''), admin_notes), updated_at = NOW() WHERE id = $3\`,
			req.Status, req.AdminNotes, cID)

		if req.Status == "completed" || req.Status == "finished" || req.Status == "cancelled" {
			h.db.Exec(ctx, \`UPDATE missions SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1\`, cID)
		} else if req.Status == "active" {
			res, _ := h.db.Exec(ctx, \`UPDATE missions SET status = 'active', updated_at = NOW() WHERE campaign_id = $1\`, cID)
			if res.RowsAffected() == 0 {
				var c2 models.Campaign
				if err := h.db.QueryRow(ctx,
					\`SELECT id, type, target, title, reward_bp FROM campaigns WHERE id = $1\`, cID).
					Scan(&c2.ID, &c2.Type, &c2.Target, &c2.Title, &c2.RewardBP); err == nil {
					h.db.Exec(ctx,
						\`INSERT INTO missions (id, type, target, title, reward_bp, campaign_id, sort_order, status, created_at, updated_at)
						 VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', NOW(), NOW())
						 ON CONFLICT DO NOTHING\`,
						uuid.New(), c2.Type, c2.Target, c2.Title, c2.RewardBP, c2.ID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign updated"})
}`;

if (adminHandlerCode.includes(oldUpdateCampaign)) {
  adminHandlerCode = adminHandlerCode.replace(oldUpdateCampaign, newUpdateCampaign);
  fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
  console.log('✅ admin_handler.go updated!');
} else {
  console.log('⚠️ Could not find exact old UpdateCampaign chunk, checking regex replacement...');
  adminHandlerCode = adminHandlerCode.replace(/\/\/ PATCH \/api\/admin\/campaigns\/:id[\s\S]*?c\.JSON\(http\.StatusOK, gin\.H\{"message": "Campaign updated"\}\)\s*\}/, newUpdateCampaign);
  fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
  console.log('✅ admin_handler.go updated via regex!');
}

console.log('=== Step 2: Update main.go with linkkiemtienmoney completion query ===');
const mainGoPath = 'd:/antigravity/HashBee/backend/cmd/server/main.go';
let mainGoCode = fs.readFileSync(mainGoPath, 'utf8');

const linkCompletionQuery = `
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
	\`)
`;

if (!mainGoCode.includes('CMP59C71940F2')) {
  mainGoCode = mainGoCode.replace(
    /WHERE \(payment_memo = 'CMP38C60EC604'[\s\S]*?\n\t\)/,
    `$&` + linkCompletionQuery
  );
  fs.writeFileSync(mainGoPath, mainGoCode, 'utf8');
  console.log('✅ main.go updated with linkkiemtienmoney completion query!');
} else {
  console.log('ℹ️ main.go already contains CMP59C71940F2');
}

console.log('=== Step 3: Update Admin Panel HTML files ===');
const htmlPaths = [
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html'
];

htmlPaths.forEach(hPath => {
  if (!fs.existsSync(hPath)) return;
  let html = fs.readFileSync(hPath, 'utf8');

  // Replace campaign table row action column
  const oldActionColRegex = /<td>\s*<div style="display:flex; gap:6px; align-items:center;">[\s\S]*?<\/div>\s*<\/td>/;
  
  const newActionCol = `<td>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:nowrap;">
              \${isWaiting ? \`
                <button onclick="activateCampaign('\${c.id}')" class="btn btn-primary" style="padding:5px 9px; font-size:11px;">
                  ⚡ Activate
                </button>
              \` : (c.status === 'completed' || c.status === 'finished') ? \`
                <button onclick="setCampaignStatus('\${c.id}', 'active')" class="btn" style="background:#1e293b; color:#38bdf8; border:1px solid #0284c7; padding:5px 9px; font-size:11px; font-weight:700;">
                  ▶️ Reactivate
                </button>
              \` : \`
                <button onclick="setCampaignStatus('\${c.id}', 'completed')" class="btn" style="background:#064e3b; color:#34d399; border:1px solid #059669; padding:5px 9px; font-size:11px; font-weight:700;">
                  ✅ Complete
                </button>
              \`}
              <button onclick="boostCampaign('\${c.id}', \${c.done_completions || 0}, \${c.total_completions || 0})" class="btn" style="background:#451a03; color:#fbbf24; border:1px solid #d97706; padding:5px 9px; font-size:11px; font-weight:700;">
                ⚡ Boost
              </button>
              <button onclick="deleteCampaign('\${c.id}')" class="btn btn-danger" style="padding:5px 9px; font-size:11px;">
                🗑️ Delete
              </button>
            </div>
          </td>`;

  // Inject or update setCampaignStatus and boostCampaign JS functions
  const oldFunctionsRegex = /async function boostCampaign[\s\S]*?async function deleteCampaign/;
  const newFunctions = `async function setCampaignStatus(id, newStatus) {
  const label = newStatus === 'completed' ? 'mark this campaign as COMPLETED' : 'REACTIVATE this campaign';
  if (!confirm('Are you sure you want to ' + label + '?')) return;
  try {
    const res = await fetch(API_URL + '/api/admin/campaigns/' + id, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus, admin_notes: 'Status changed to ' + newStatus + ' by admin' })
    });
    if (!res.ok) throw new Error('Failed to update status');
    showToast('✅ Campaign status updated to ' + newStatus.toUpperCase());
    loadCampaigns();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function boostCampaign(id, currentDone, total) {
  const newDone = prompt('⚡ Boost Campaign Progress:\\nEnter new completed count (Current: ' + currentDone + '/' + total + '):', currentDone);
  if (newDone === null || newDone.trim() === '' || isNaN(parseInt(newDone))) return;
  const doneVal = parseInt(newDone.trim());
  try {
    const res = await fetch(API_URL + '/api/admin/campaigns/' + id, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ done_completions: doneVal })
    });
    if (!res.ok) throw new Error('Boost failed');
    showToast('⚡ Campaign progress updated to ' + doneVal + ' / ' + total);
    loadCampaigns();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteCampaign`;

  if (oldActionColRegex.test(html)) {
    html = html.replace(oldActionColRegex, newActionCol);
  }

  if (oldFunctionsRegex.test(html)) {
    html = html.replace(oldFunctionsRegex, newFunctions);
  } else {
    // If not found, look for deleteCampaign and prepend
    html = html.replace(/async function deleteCampaign/, `async function setCampaignStatus(id, newStatus) {
  const label = newStatus === 'completed' ? 'mark this campaign as COMPLETED' : 'REACTIVATE this campaign';
  if (!confirm('Are you sure you want to ' + label + '?')) return;
  try {
    const res = await fetch(API_URL + '/api/admin/campaigns/' + id, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus, admin_notes: 'Status changed to ' + newStatus + ' by admin' })
    });
    if (!res.ok) throw new Error('Failed to update status');
    showToast('✅ Campaign status updated to ' + newStatus.toUpperCase());
    loadCampaigns();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function boostCampaign(id, currentDone, total) {
  const newDone = prompt('⚡ Boost Campaign Progress:\\nEnter new completed count (Current: ' + currentDone + '/' + total + '):', currentDone);
  if (newDone === null || newDone.trim() === '' || isNaN(parseInt(newDone))) return;
  const doneVal = parseInt(newDone.trim());
  try {
    const res = await fetch(API_URL + '/api/admin/campaigns/' + id, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ done_completions: doneVal })
    });
    if (!res.ok) throw new Error('Boost failed');
    showToast('⚡ Campaign progress updated to ' + doneVal + ' / ' + total);
    loadCampaigns();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteCampaign`);
  }

  fs.writeFileSync(hPath, html, 'utf8');
  console.log('✅ Updated HTML file:', hPath);
});

console.log('Done!');
