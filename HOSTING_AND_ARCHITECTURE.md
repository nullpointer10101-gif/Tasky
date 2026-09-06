# TASKY — Hosting, Architecture & Deployment Reference

This document serves as the single source of truth for the hosting environments, live endpoints, and deployment procedures for the Tasky project.

---

## 1. System Architecture Overview

| Component | Technology | Primary Host | Live URL | Deployment Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Telegram Bot** | Node.js (`node-telegram-bot-api`) | Render (`Tasky3`) | [`@TaskyAppbot`](https://t.me/TaskyAppbot) | `git push origin main` |
| **Backend API** | Node.js / Express | Render (`Tasky3`) | `https://tasky3.onrender.com/api/` | `git push origin main` |
| **Database** | PostgreSQL | Render Database | Internal / External Pool | Managed via Render |
| **Mini App (User App)** | React (Vite) | Render Direct & Vercel | `https://tasky3.onrender.com` | `npm run build` in `miniapp/` -> copy to `backend/public/app` -> `git push` |
| **Admin Panel** | React (Vite) | Render Direct & Vercel | `https://tasky3.onrender.com/admin` | `npm run build` in `admin-frontend/` -> copy to `backend/public/admin` -> `git push` |

---

## 2. Detailed Hosting Environments

### 2.1 Backend & Database (Render)
- **Platform**: [Render](https://render.com)
- **Service Name**: `Tasky3` (ID: `srv-daell71t0dsc73aodmmg`)
- **Base URL**: `https://tasky3.onrender.com`
- **Auto-Deploy**: Enabled on pushes to the `main` branch on GitHub (`https://github.com/nullpointer10101-gif/Tasky.git`).
- **Static Assets Serving**: The backend automatically serves:
  - Mini App at `https://tasky3.onrender.com/` (from `backend/public/app`)
  - Admin Panel at `https://tasky3.onrender.com/admin` (from `backend/public/admin`)
  - TonConnect Manifest at `https://tasky3.onrender.com/tonconnect-manifest.json`

### 2.2 Mini App (Direct Hosting vs Vercel)
- **Primary Live URL**: `https://tasky3.onrender.com`
  - Served directly from Render's static handler inside Express.
  - Avoids Vercel's 100 deployments/day limit and eliminates CORS issues.
- **Secondary Mirror**: Vercel (`tasky-v3`)
  - Manual deploy command: `npx vercel --prod --yes --cwd miniapp`

### 2.3 Admin Panel (Direct Hosting vs Vercel)
- **Primary Live URL**: `https://tasky3.onrender.com/admin`
- **Secondary Mirror**: Vercel (`tasky-d81s`)
  - Live URL: `https://tasky-d81s.vercel.app`
  - Manual deploy command: `npx vercel --prod --yes --cwd admin-frontend`

---

## 3. Ad Network Providers

1. **GigaPub (Primary)**:
   - Script ID: `8093` (`https://ad.gigapub.tech/script?id=8093`)
   - Auto-initializes on startup.
2. **Monetag (Secondary / Fallback)**:
   - Zone ID: `11395836`
   - Script: `https://libtl.com/sdk.js` with SDK function `show_11395836`
   - Seamless fallback automatically triggers if GigaPub is under review or unavailable.
3. **Adsgram**: Permanently disabled and blocked in code.

---

## 4. Standard Deployment Checklist

Whenever updating the Mini App or Admin Panel:
```powershell
# 1. Build Mini App
cd miniapp
npm run build
cd ..

# 2. Copy Mini App to backend public folder
Copy-Item -Path miniapp\dist\* -Destination backend\public\app -Recurse -Force

# 3. Build Admin Panel (if modified)
cd admin-frontend
npm run build
cd ..
Copy-Item -Path admin-frontend\dist\* -Destination backend\public\admin -Recurse -Force

# 4. Commit and Push to Render
git add miniapp/ admin-frontend/ backend/
git commit -m "Your descriptive commit message"
git push origin main
```
Render will automatically build and deploy within 1-2 minutes.
