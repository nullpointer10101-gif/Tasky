const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update main.go with startup boost query
const mainPath = path.join(hashbeeDir, 'backend/cmd/server/main.go');
let mainCode = fs.readFileSync(mainPath, 'utf8');

const startupBoostBlock = `	defer pool.Close()
	log.Println("✅ Database connected")

	// Startup campaign completions boost for the 2 tasks to approx 200
	_, _ = pool.Exec(ctx, \`
		UPDATE campaigns 
		SET done_completions = 208, updated_at = NOW() 
		WHERE (payment_memo = 'CMPA081BE29E9' OR target ILIKE '%onlinee1994%') AND done_completions < 208
	\`)
	_, _ = pool.Exec(ctx, \`
		UPDATE campaigns 
		SET done_completions = 194, updated_at = NOW() 
		WHERE (payment_memo = 'CMP38C60EC604' OR target ILIKE '%referral199%') AND done_completions < 194
	\`)`;

if (!mainCode.includes('Startup campaign completions boost')) {
  mainCode = mainCode.replace('	defer pool.Close()\n\tlog.Println("✅ Database connected")', startupBoostBlock);
  fs.writeFileSync(mainPath, mainCode, 'utf8');
  console.log('✅ Added startup campaign boost to main.go');
}

// 2. Add UpdateCampaign to admin_handler.go
const handlerPath = path.join(hashbeeDir, 'backend/internal/handlers/admin_handler.go');
let handlerCode = fs.readFileSync(handlerPath, 'utf8');

if (!handlerCode.includes('func (h *AdminHandler) UpdateCampaign')) {
  const updateCampaignFunc = `
// PATCH /api/admin/campaigns/:id - Update campaign progress or status
func (h *AdminHandler) UpdateCampaign(c *gin.Context) {
	cID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid campaign id"})
		return
	}

	var req struct {
		DoneCompletions  *int    ` + "`" + `json:"done_completions"` + "`" + `
		TotalCompletions *int    ` + "`" + `json:"total_completions"` + "`" + `
		Status           *string ` + "`" + `json:"status"` + "`" + `
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	if req.DoneCompletions != nil {
		_, _ = h.db.Exec(ctx, \`UPDATE campaigns SET done_completions = $1, updated_at = NOW() WHERE id = $2\`, *req.DoneCompletions, cID)
	}
	if req.TotalCompletions != nil {
		_, _ = h.db.Exec(ctx, \`UPDATE campaigns SET total_completions = $1, updated_at = NOW() WHERE id = $2\`, *req.TotalCompletions, cID)
	}
	if req.Status != nil {
		_, _ = h.db.Exec(ctx, \`UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2\`, *req.Status, cID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign updated successfully"})
}
`;
  handlerCode = handlerCode.replace('type BroadcastJobStatus struct {', updateCampaignFunc + '\ntype BroadcastJobStatus struct {');
  fs.writeFileSync(handlerPath, handlerCode, 'utf8');
  console.log('✅ Added UpdateCampaign handler to admin_handler.go');
}

// 3. Update HTML files with Boost button in Actions column
const htmlFiles = [
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html')
];

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Add Boost button in campaign table rows
  if (!html.includes('boostCampaign(')) {
    html = html.replace(
      `<button onclick="deleteCampaign('\${c.id}')" class="btn btn-danger" style="padding:6px 10px; font-size:10px;">🗑️ Delete</button>`,
      `<button onclick="boostCampaign('\${c.id}', \${c.done_completions || 0})" class="btn btn-secondary" style="padding:6px 10px; font-size:10px; color:#10b981; border-color:#10b98133;">⚡ Boost</button>\n            <button onclick="deleteCampaign('\${c.id}')" class="btn btn-danger" style="padding:6px 10px; font-size:10px;">🗑️ Delete</button>`
    );

    // Add boostCampaign JS function
    const boostJsFunc = `
async function boostCampaign(id, currentDone) {
  const newDone = prompt('Enter new completed count (progress):', currentDone);
  if (newDone === null || isNaN(parseInt(newDone))) return;
  try {
    const res = await fetch(API_URL + '/api/admin/campaigns/' + id, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ done_completions: parseInt(newDone) })
    });
    if (!res.ok) throw new Error('Boost failed');
    showToast('⚡ Campaign progress updated to ' + newDone);
    loadCampaigns();
  } catch (err) {
    showToast(err.message, true);
  }
}
`;
    html = html.replace('async function deleteCampaign(id) {', boostJsFunc + '\nasync function deleteCampaign(id) {');
    fs.writeFileSync(file, html, 'utf8');
    console.log(`✅ Updated ${file} with Boost Campaign feature`);
  }
});
