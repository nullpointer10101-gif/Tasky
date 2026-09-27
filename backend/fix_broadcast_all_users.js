const fs = require('fs');

console.log('=== Step 1: Update bot.go BroadcastRecipientsProgress ===');
const botGoPath = 'd:/antigravity/HashBee/backend/internal/bot/bot.go';
let botGoCode = fs.readFileSync(botGoPath, 'utf8');

const oldBroadcastRecipients = `// BroadcastRecipientsProgress sends personalized messages concurrently with rate limiting and progress callback
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
}`;

const newBroadcastRecipients = `// BroadcastRecipientsProgress sends personalized messages concurrently with rate limiting and progress callback
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

	limiter := time.NewTicker(35 * time.Millisecond)
	defer limiter.Stop()

	var wg sync.WaitGroup
	workers := 8
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
					// Fallback to plain text if Markdown entity parsing failed
					msgPlain := tgbotapi.NewMessage(r.TelegramID, userMsg)
					msgPlain.ReplyMarkup = keyboard
					if _, err2 := b.api.Send(msgPlain); err2 != nil {
						atomic.AddInt64(&failedCount, 1)
					} else {
						atomic.AddInt64(&sentCount, 1)
					}
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
}`;

if (botGoCode.includes(oldBroadcastRecipients)) {
  botGoCode = botGoCode.replace(oldBroadcastRecipients, newBroadcastRecipients);
  fs.writeFileSync(botGoPath, botGoCode, 'utf8');
  console.log('✅ bot.go updated with robust Markdown fallback & 8 workers!');
} else {
  console.log('⚠️ bot.go replacement chunk not exact match, using regex replacement');
  botGoCode = botGoCode.replace(/\/\/ BroadcastRecipientsProgress[\s\S]*?return int\(sentCount\), int\(failedCount\)\s*\}/, newBroadcastRecipients);
  fs.writeFileSync(botGoPath, botGoCode, 'utf8');
  console.log('✅ bot.go updated via regex!');
}

console.log('=== Step 2: Update admin_handler.go query for ALL users ===');
const adminHandlerPath = 'd:/antigravity/HashBee/backend/internal/handlers/admin_handler.go';
let adminHandlerCode = fs.readFileSync(adminHandlerPath, 'utf8');

adminHandlerCode = adminHandlerCode.replace(
  /SELECT telegram_id, COALESCE\(first_name, username, ''\) FROM users WHERE status = 'active'/,
  `SELECT DISTINCT telegram_id, COALESCE(first_name, username, '') FROM users WHERE telegram_id > 0 AND (status IS NULL OR status != 'banned')`
);

fs.writeFileSync(adminHandlerPath, adminHandlerCode, 'utf8');
console.log('✅ admin_handler.go updated to include ALL non-banned users in broadcast!');

console.log('=== Step 3: Update Admin Panel HTML files with live progress polling ===');
const htmlPaths = [
  'd:/antigravity/HashBee/backend/public/admin/index.html',
  'd:/antigravity/HashBee/miniapp/public/admin/index.html',
  'd:/antigravity/HashBee/backend/public/app/admin/index.html'
];

htmlPaths.forEach(hPath => {
  if (!fs.existsSync(hPath)) return;
  let html = fs.readFileSync(hPath, 'utf8');

  // Replace sendBroadcast implementation with full polling
  const oldSendBroadcastRegex = /async function sendBroadcast\(\) \{[\s\S]*?\n\}/;
  const newSendBroadcast = `let broadcastPollTimer = null;

function startBroadcastPolling() {
  const box = document.getElementById('broadcastProgressBox');
  if (box) box.style.display = 'block';

  if (broadcastPollTimer) clearInterval(broadcastPollTimer);

  broadcastPollTimer = setInterval(async () => {
    try {
      const res = await fetch(API_URL + '/api/admin/broadcast/status', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();

      document.getElementById('broadcastNumbers').innerText = (data.done || 0) + ' / ' + (data.total || 0);
      document.getElementById('broadcastSentCount').innerText = data.sent || 0;
      document.getElementById('broadcastFailedCount').innerText = data.failed || 0;
      document.getElementById('broadcastPercent').innerText = (data.percent || 0) + '%';
      document.getElementById('broadcastProgressBar').style.width = (data.percent || 0) + '%';

      if (data.is_running) {
        document.getElementById('broadcastStatusText').innerText = '⚡ Broadcasting in progress (' + (data.percent || 0) + '%)...';
        document.getElementById('broadcastStatusText').style.color = '#10b981';
      } else {
        clearInterval(broadcastPollTimer);
        broadcastPollTimer = null;
        document.getElementById('broadcastStatusText').innerText = '🎉 Broadcast Completed! (Sent: ' + (data.sent || 0) + ' / Total: ' + (data.total || 0) + ')';
        document.getElementById('broadcastStatusText').style.color = '#06b6d4';
        const btn = document.getElementById('sendBroadcastBtn');
        if (btn) {
          btn.innerText = '🚀 Send Hype Broadcast Now';
          btn.disabled = false;
        }
      }
    } catch (e) {}
  }, 800);
}

async function sendBroadcast() {
  const msg = document.getElementById('broadcastMsg').value.trim();
  const btnText = document.getElementById('broadcastBtnText').value.trim();
  const btnUrl = document.getElementById('broadcastBtnUrl').value.trim();
  const audience = document.getElementById('broadcastAudience').value;
  const targetTgId = parseInt(document.getElementById('broadcastTargetTgId').value) || 0;

  if (!msg) {
    showToast('Please enter a message to broadcast', true);
    return;
  }

  if (audience === 'single' && !targetTgId) {
    showToast('Please enter target Telegram ID', true);
    return;
  }

  const confirmMsg = audience === 'all'
    ? 'Are you sure you want to broadcast this message to ALL registered users?'
    : 'Send test broadcast to Telegram ID: ' + targetTgId + '?';

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('sendBroadcastBtn');
  btn.innerText = '⏳ Broadcasting messages...';
  btn.disabled = true;

  try {
    const res = await fetch(API_URL + '/api/admin/broadcast', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message: msg,
        button_text: btnText,
        button_url: btnUrl,
        target_telegram_id: audience === 'single' ? targetTgId : 0
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Broadcast failed');
    showToast('📢 ' + data.message);
    startBroadcastPolling();
  } catch (err) {
    showToast(err.message, true);
    btn.innerText = '🚀 Send Hype Broadcast Now';
    btn.disabled = false;
  }
}`;

  html = html.replace(oldSendBroadcastRegex, newSendBroadcast);
  fs.writeFileSync(hPath, html, 'utf8');
  console.log('✅ Admin HTML updated with live polling:', hPath);
});

console.log('Done!');
