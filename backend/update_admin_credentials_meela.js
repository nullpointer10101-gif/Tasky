const fs = require('fs');

console.log('=== Step 1: Update main.go to seed meela / meela admin credentials ===');
const mainGoPath = 'd:/antigravity/HashBee/backend/cmd/server/main.go';
let mainGoCode = fs.readFileSync(mainGoPath, 'utf8');

const meelaAdminSeed = `
	// Seed exclusive admin credentials (username: meela / password: meela)
	meelaHash, _ := bcrypt.GenerateFromPassword([]byte("meela"), bcrypt.DefaultCost)
	_, _ = pool.Exec(ctx, "DELETE FROM admin_users WHERE email != 'meela'")
	_, _ = pool.Exec(ctx, \`
		INSERT INTO admin_users (id, email, password_hash, role, status, created_at, updated_at)
		VALUES ($1, 'meela', $2, 'super_admin', 'active', NOW(), NOW())
		ON CONFLICT (email) DO UPDATE SET password_hash = $2, status = 'active', updated_at = NOW()
	\`, uuid.New(), string(meelaHash))
`;

if (!mainGoCode.includes('meelaHash')) {
  mainGoCode = mainGoCode.replace(
    /log\.Println\("✅ Database connected"\)/,
    `log.Println("✅ Database connected")` + meelaAdminSeed
  );
  fs.writeFileSync(mainGoPath, mainGoCode, 'utf8');
  console.log('✅ main.go updated with meela admin seed!');
}

console.log('=== Step 2: Update admin_handler.go Login method ===');
const adminHandlerPath = 'd:/antigravity/HashBee/backend/internal/handlers/admin_handler.go';
let adminHandlerCode = fs.readFileSync(adminHandlerPath, 'utf8');

const oldLoginHandler = `// POST /api/admin/login
func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Email    string \`json:"email"\`
		Username string \`json:"username"\`
		Password string \`json:"password" binding:"required"\`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	identifier := req.Email
	if identifier == "" {
		identifier = req.Username
	}
	if identifier == "" {
		identifier = "admin@hashbee.io"
	}

	// Auto-seed default admin if no admin users exist yet
	var count int
	_ = h.db.QueryRow(c.Request.Context(), \`SELECT COUNT(*) FROM admin_users\`).Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		_, _ = h.db.Exec(c.Request.Context(),
			\`INSERT INTO admin_users (email, password_hash, role, status) VALUES ('admin@hashbee.io', $1, 'super_admin', 'active') ON CONFLICT DO NOTHING\`,
			string(hash))
	}

	var admin models.AdminUser
	err := h.db.QueryRow(c.Request.Context(),
		\`SELECT id, email, password_hash, role, status FROM admin_users WHERE (email = $1 OR (email = 'admin@hashbee.io' AND ($1 = 'admin' OR $1 = 'admin@hashbee.io'))) AND status = 'active' LIMIT 1\`,
		identifier).Scan(&admin.ID, &admin.Email, &admin.PasswordHash, &admin.Role, &admin.Status)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}`;

const newLoginHandler = `// POST /api/admin/login
func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Email      string \`json:"email"\`
		Username   string \`json:"username"\`
		Identifier string \`json:"identifier"\`
		Password   string \`json:"password" binding:"required"\`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Username)
	}
	if identifier == "" {
		identifier = strings.TrimSpace(req.Email)
	}
	if identifier == "" {
		identifier = "meela"
	}

	// Auto-seed meela admin if no admin users exist yet
	var count int
	_ = h.db.QueryRow(c.Request.Context(), \`SELECT COUNT(*) FROM admin_users\`).Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("meela"), bcrypt.DefaultCost)
		_, _ = h.db.Exec(c.Request.Context(),
			\`INSERT INTO admin_users (id, email, password_hash, role, status, created_at, updated_at) VALUES ($1, 'meela', $2, 'super_admin', 'active', NOW(), NOW()) ON CONFLICT DO NOTHING\`,
			uuid.New(), string(hash))
	}

	var admin models.AdminUser
	err := h.db.QueryRow(c.Request.Context(),
		\`SELECT id, email, password_hash, role, status FROM admin_users WHERE (LOWER(email) = LOWER($1)) AND status = 'active' LIMIT 1\`,
		identifier).Scan(&admin.ID, &admin.Email, &admin.PasswordHash, &admin.Role, &admin.Status)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}`;

if (adminHandlerCode.includes(oldLoginHandler)) {
  adminHandlerCode = adminHandlerCode.replace(oldLoginHandler, newLoginHandler);
  fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
  console.log('✅ admin_handler.go updated with meela authentication!');
} else {
  console.log('⚠️ Could not match exact oldLoginHandler, trying regex');
  adminHandlerCode = adminHandlerCode.replace(
    /\/\/ POST \/api\/admin\/login[\s\S]*?if err := bcrypt\.CompareHashAndPassword\(\[\]byte\(admin\.PasswordHash\), \[\]byte\(req\.Password\)\); err != nil \{\s*c\.JSON\(http\.StatusUnauthorized, gin\.H\{"error": "invalid credentials"\}\)\s*return\s*\}/,
    newLoginHandler
  );
  fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
  console.log('✅ admin_handler.go updated via regex!');
}

console.log('=== Step 3: Update Admin Panel HTML files default inputs ===');
const htmlPaths = [
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html'
];

htmlPaths.forEach(hPath => {
  if (!fs.existsSync(hPath)) return;
  let html = fs.readFileSync(hPath, 'utf8');

  html = html.replace(
    /value="admin@hashbee\.io" required placeholder="admin@hashbee\.io"/g,
    `value="meela" required placeholder="meela"`
  );

  html = html.replace(
    /value="admin123" required placeholder="••••••••"/g,
    `value="meela" required placeholder="••••••••"`
  );

  fs.writeFileSync(hPath, html, 'utf8');
  console.log('✅ Admin HTML login defaults updated to meela:', hPath);
});

console.log('Done!');
