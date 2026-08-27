# Production & User Data Rules

- **CRITICAL**: Whenever you are performing actions that affect production systems, broadcast messages to users, or modify user-level data, you MUST stop and double-check all URLs, configurations, parameters, and scripts for correctness before executing them. Treat production data and broadcasts with extreme caution.
Rule: The official Telegram bot handle is @TaskyAppbot. Always use this link when referring to the bot.

# Deployment Rules
- **Vercel Hobby Plan Push Block**: Because the Vercel project is owned by `meelas-projects-784c876a` but commits are pushed under a collaborator profile, automatic Git deployment is blocked on Vercel.
- **How to Deploy**: Always deploy changes manually using the local Vercel CLI which is already authenticated:
  - **Deploy Admin Panel (tasky-d81s)**: Run `npx vercel --prod --yes --cwd admin-frontend` from the repository root.
  - **Deploy Mini App (tasky)**: Run `npx vercel --prod --yes --cwd miniapp` from the repository root.
