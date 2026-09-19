# Production & User Data Rules

- **CRITICAL**: Whenever you are performing actions that affect production systems, broadcast messages to users, or modify user-level data, you MUST stop and double-check all URLs, configurations, parameters, and scripts for correctness before executing them. Treat production data and broadcasts with extreme caution.
- Rule: The official Telegram bot handle is @TaskyAppbot. Always use `https://t.me/TaskyAppbot` or `https://t.me/TaskyAppbot/app` when referring to the bot.
- For complete architecture & deployment reference, see [HOSTING_AND_ARCHITECTURE.md](file:///d:/antigravity/Tasky/HOSTING_AND_ARCHITECTURE.md).

# Hosting & Architecture (Render + Vercel Hybrid)
- **Primary Host**: Render (service `Tasky3`, `https://tasky3.onrender.com`).
- **Vercel CDN**: Vercel project `tasky-v3` (`https://tasky-v3.vercel.app/`). Serves heavy static JS/CSS bundles for **$0 Render bandwidth bill**.
- **Direct Mini App Hosting**: Render serves the Mini App shell at `https://tasky3.onrender.com/` (from `backend/public/app`).
- **Admin Panel Hosting**: Render serves the Admin Panel at `https://tasky3.onrender.com/admin` (from `backend/public/admin`).
- **Deployment Process**: 
  1. Build the Mini App (`cd miniapp; npm run build`).
  2. Deploy Vercel CDN (`npx vercel --prod --yes --cwd miniapp`).
  3. Copy `miniapp/dist/*` to `backend/public/app/`.
  4. Commit and push to GitHub: `git add -A; git commit -m "..."; git push origin main`. Render auto-deploys from `main`.
