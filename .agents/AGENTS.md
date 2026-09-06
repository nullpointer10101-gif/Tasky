# Production & User Data Rules

- **CRITICAL**: Whenever you are performing actions that affect production systems, broadcast messages to users, or modify user-level data, you MUST stop and double-check all URLs, configurations, parameters, and scripts for correctness before executing them. Treat production data and broadcasts with extreme caution.
- Rule: The official Telegram bot handle is @TaskyAppbot. Always use this link when referring to the bot.
- For complete architecture & deployment reference, see [HOSTING_AND_ARCHITECTURE.md](file:///d:/antigravity/Tasky/HOSTING_AND_ARCHITECTURE.md).

# Backend & Direct App Hosting
- **CRITICAL**: The backend (Express/Node.js in `backend/`) is hosted on **Render** (render.com — service `Tasky3`).
- **Direct Mini App & Admin Hosting**: Render directly serves the Mini App at `https://tasky3.onrender.com/` (from `backend/public/app`) and the Admin Panel at `https://tasky3.onrender.com/admin` (from `backend/public/admin`).
- **How Render deploys**: Render auto-deploys from GitHub pushes to the `main` branch. To deploy backend and direct app changes, commit and push to GitHub: `git commit` then `git push origin main`.
- **Backend URL**: Stored as `VITE_API_URL` / direct proxy.

# Vercel Deployment (Secondary Mirror)
- **Vercel Hobby Plan Push Block**: Because the Vercel project is owned by `meelas-projects-784c876a` but commits are pushed under a collaborator profile, automatic Git deployment is blocked on Vercel.
- **How to Deploy to Vercel**: Always deploy changes manually using the local Vercel CLI:
  - **Deploy Admin Panel (tasky-d81s)**: Run `npx vercel --prod --yes --cwd admin-frontend` from the repository root.
  - **Deploy Mini App (tasky)**: Run `npx vercel --prod --yes --cwd miniapp` from the repository root.
