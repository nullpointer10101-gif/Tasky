# Production & User Data Rules

- **CRITICAL**: Whenever you are performing actions that affect production systems, broadcast messages to users, or modify user-level data, you MUST stop and double-check all URLs, configurations, parameters, and scripts for correctness before executing them. Treat production data and broadcasts with extreme caution.
- Rule: The official Telegram bot handle is @TaskyAppbot. Always use this link when referring to the bot.
- For complete architecture & deployment reference, see [HOSTING_AND_ARCHITECTURE.md](file:///d:/antigravity/Tasky/HOSTING_AND_ARCHITECTURE.md).

# Hosting & Architecture (Render Only)
- **Primary & Only Host**: The entire project (Backend, Mini App, and Admin Panel) is hosted on **Render** (service `Tasky3`).
- **Direct Mini App Hosting**: Render directly serves the Mini App at `https://tasky3.onrender.com/` (from `backend/public/app`).
- **Admin Panel Hosting**: Render directly serves the Admin Panel at `https://tasky3.onrender.com/admin` (from `backend/public/admin`).
- **Deployment Process**: 
  1. Build the Mini App (`npm run build` in `miniapp/`).
  2. Copy `miniapp/dist/*` to `backend/public/app/`.
  3. Commit and push to GitHub: `git commit` then `git push origin main`. Render auto-deploys from `main`.
- **Note**: Vercel is NOT used. All traffic runs through Render.
