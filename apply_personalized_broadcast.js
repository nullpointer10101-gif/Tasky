const fs = require('fs');
const path = require('path');

const hashbeeDir = 'd:/antigravity/HashBee';

// 1. Update bot.go
const botPath = path.join(hashbeeDir, 'backend/internal/bot/bot.go');
let botCode = fs.readFileSync(botPath, 'utf8');

if (!botCode.includes('type BroadcastRecipient struct')) {
  const recipientTypesAndFunc = `
type BroadcastRecipient struct {
	TelegramID int64
	FirstName  string
}

// BroadcastRecipientsProgress sends personalized messages concurrently with rate limiting and progress callback
func (b *Bot) BroadcastRecipientsProgress(ctx context.Context, text string, buttonText, buttonURL string, recipients []BroadcastRecipient, onProgress func(sent, failed, total int)) (int, int) {
	if b == nil || b.api == nil || len(recipients) == 0 {
		return 0, 0
	}

	keyboard := newWebAppKeyboard(buttonText, buttonURL)
	total := len(recipients)
	var sentCount int64
	var failedCount int64

	jobs := make(chan BroadcastRecipient, total)
	for _, r := range recipients {
		jobs <- r
	}
	close(jobs)

	limiter := time.NewTicker(33 * time.Millisecond)
	defer limiter.Stop()

	var wg sync.WaitGroup
	workers := 5
	if total < workers {
		workers = total
	}

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range jobs {
				select {
				case <-ctx.Done():
					return
				case <-limiter.C:
				}

				userMsg := text
				if strings.Contains(text, "{name}") || strings.Contains(text, "{first_name}") {
					name := strings.TrimSpace(r.FirstName)
					if name == "" {
						name = "Miner"
					}
					userMsg = strings.ReplaceAll(userMsg, "{name}", name)
					userMsg = strings.ReplaceAll(userMsg, "{first_name}", name)
				}

				msg := tgbotapi.NewMessage(r.TelegramID, userMsg)
				msg.ParseMode = "Markdown"
				msg.ReplyMarkup = keyboard

				if _, err := b.api.Send(msg); err != nil {
					atomic.AddInt64(&failedCount, 1)
				} else {
					atomic.AddInt64(&sentCount, 1)
				}

				if onProgress != nil {
					s := int(atomic.LoadInt64(&sentCount))
					f := int(atomic.LoadInt64(&failedCount))
					onProgress(s, f, total)
				}
			}
		}()
	}

	wg.Wait()
	return int(sentCount), int(failedCount)
}
`;
  botCode += recipientTypesAndFunc;
  fs.writeFileSync(botPath, botCode, 'utf8');
  console.log('✅ Added BroadcastRecipientsProgress to bot.go');
}

// 2. Update admin_handler.go
const handlerPath = path.join(hashbeeDir, 'backend/internal/handlers/admin_handler.go');
let handlerCode = fs.readFileSync(handlerPath, 'utf8');

// Update BotBroadcaster interface
if (!handlerCode.includes('BroadcastRecipientsProgress')) {
  handlerCode = handlerCode.replace(
    'type BotBroadcaster interface {',
    'type BotBroadcaster interface {\n\tBroadcastRecipientsProgress(ctx context.Context, text string, buttonText, buttonURL string, recipients []bot.BroadcastRecipient, onProgress func(sent, failed, total int)) (int, int)'
  );
  console.log('✅ Updated BotBroadcaster interface in admin_handler.go');
}

// Update Broadcast handler to fetch first_name and call BroadcastRecipientsProgress
const oldQueryBlock = `	var tgIDs []int64
	if req.TargetTelegramID > 0 {
		tgIDs = append(tgIDs, req.TargetTelegramID)
	} else {
		rows, err := h.db.Query(c.Request.Context(), \`SELECT telegram_id FROM users WHERE status = 'active'\`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users: " + err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int64
			if err := rows.Scan(&id); err == nil && id > 0 {
				tgIDs = append(tgIDs, id)
			}
		}
	}

	total := len(tgIDs)`;

const newQueryBlock = `	var recipients []bot.BroadcastRecipient
	if req.TargetTelegramID > 0 {
		var fn string
		_ = h.db.QueryRow(c.Request.Context(), \`SELECT COALESCE(first_name, username, '') FROM users WHERE telegram_id = $1\`, req.TargetTelegramID).Scan(&fn)
		recipients = append(recipients, bot.BroadcastRecipient{TelegramID: req.TargetTelegramID, FirstName: fn})
	} else {
		rows, err := h.db.Query(c.Request.Context(), \`SELECT telegram_id, COALESCE(first_name, username, '') FROM users WHERE status = 'active'\`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query users: " + err.Error()})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id int64
			var fn string
			if err := rows.Scan(&id, &fn); err == nil && id > 0 {
				recipients = append(recipients, bot.BroadcastRecipient{TelegramID: id, FirstName: fn})
			}
		}
	}

	total := len(recipients)`;

if (handlerCode.includes(oldQueryBlock)) {
  handlerCode = handlerCode.replace(oldQueryBlock, newQueryBlock);
  console.log('✅ Updated Broadcast handler recipients query');
}

const oldSendCall = `sent, failed := h.bot.BroadcastWithButtonProgress(ctx, req.Message, req.ButtonText, req.ButtonURL, tgIDs, func(s, f, t int) {`;
const newSendCall = `sent, failed := h.bot.BroadcastRecipientsProgress(ctx, req.Message, req.ButtonText, req.ButtonURL, recipients, func(s, f, t int) {`;

if (handlerCode.includes(oldSendCall)) {
  handlerCode = handlerCode.replace(oldSendCall, newSendCall);
  console.log('✅ Updated Broadcast handler call to BroadcastRecipientsProgress');
}

fs.writeFileSync(handlerPath, handlerCode, 'utf8');

// 3. Update HTML templates
const htmlFiles = [
  path.join(hashbeeDir, 'backend/public/admin/index.html'),
  path.join(hashbeeDir, 'miniapp/public/admin/index.html'),
  path.join(hashbeeDir, 'backend/public/app/admin/index.html')
];

const newPersonalTemplate = `  personalized_buzz: {
    msg: \`👋 Hey {name}, your Hive is buzzing! 🐝⚡

⛏️ Your mining rig has accumulated unclaimed Honey! Don't let your honeycomb capacity cap out.

💰 *What you can do in the app right now:*
⚡ Collect your passive Honey earnings
🎁 Claim free GHS bonuses from your referrals
📢 Launch a Boost Campaign to get real members for your Telegram channel/bot at dirt-cheap launch prices!

👇 Tap below to harvest your rewards & boost your power:\`,
    btn: '🐝 Open HashBee & Collect Now 🚀'
  },
  mining_boost: {`;

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  if (!html.includes('personalized_buzz')) {
    html = html.replace('  mining_boost: {', newPersonalTemplate);
    
    // Also add template button in UI
    const oldButtons = `<button type="button" onclick="applyTemplate('mining_boost')" class="btn btn-secondary" style="font-size:11px;">⛏️ Mining Boost</button>`;
    const newButtons = `<button type="button" onclick="applyTemplate('personalized_buzz')" class="btn btn-gold" style="font-size:11px;">👤 Personalized (Hey {name})</button>\n          ` + oldButtons;
    if (html.includes(oldButtons)) {
      html = html.replace(oldButtons, newButtons);
    }
    fs.writeFileSync(file, html, 'utf8');
    console.log(`✅ Updated templates in ${file}`);
  }
});
