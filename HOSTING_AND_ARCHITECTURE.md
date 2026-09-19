# TASKY — Complete Hosting, Architecture & Deployment Guide

This document is the **single source of truth** for all hosting environments, project names, Vercel CDN setups, Telegram bot configurations, and deployment procedures for TASKY.

---

## 1. System Overview & Project Locations

| Component | Host / Platform | Project / Service Name | Live URL | Deployment Command |
| :--- | :--- | :--- | :--- | :--- |
| **Telegram Bot** | Render | `Tasky3` | [`@TaskyAppbot`](https://t.me/TaskyAppbot) | `git push origin main` |
| **Backend API** | Render | `Tasky3` | `https://tasky3.onrender.com/api` | `git push origin main` |
| **Database** | Render | PostgreSQL | Internal / External Pool | Managed via Render DB |
| **Mini App (Frontend)** | Vercel (CDN) + Render | `tasky-v3` (Vercel) / `Tasky3` (Render) | `https://tasky3.onrender.com/` | `npm run build` in `miniapp/` → `npx vercel --prod --yes --cwd miniapp` → Copy to `backend/public/app` → `git push` |
| **Admin Panel** | Vercel (CDN) + Render | `tasky-d81s` (Vercel) / `Tasky3` (Render) | `https://tasky3.onrender.com/admin` | `npm run build` in `admin-frontend/` → `npx vercel --prod --yes --cwd admin-frontend` → Copy to `backend/public/admin` → `git push` |

---

## 2. Platform Accounts & Infrastructure Details

### 2.1 Render (Backend & API Host)
- **Service Name**: `Tasky3`
- **Service ID**: `srv-daell71t0dsc73aodmmg`
- **Base URL**: `https://tasky3.onrender.com`
- **GitHub Repository**: `https://github.com/nullpointer10101-gif/Tasky.git` (Branch: `main`)
- **Direct Static Serving**:
  - Mini App Shell: `https://tasky3.onrender.com/` (from `backend/public/app`)
  - Admin Panel Shell: `https://tasky3.onrender.com/admin` (from `backend/public/admin`)
  - Health Check: `https://tasky3.onrender.com/api/health`

### 2.2 Vercel (Free Static CDN — $0 Render Bill)
- **Primary Vercel Account**: `meelas-projects-784c876a`
- **Mini App Project**: `tasky-v3`
  - Production CDN URL: `https://tasky-v3.vercel.app/`
  - Function: Serves compiled heavy JS/CSS bundles (`miniapp/dist`) for **100% FREE unlimited bandwidth** (keeps Render bandwidth under 5 GB = $0 Render bill).
  - Config: `miniapp/vite.config.js` sets `base: 'https://tasky-v3.vercel.app/'`.
- **Admin Panel Project**: `tasky-d81s`
  - Production CDN URL: `https://tasky-d81s.vercel.app/`

### 2.3 Telegram Bot & Links
- **Bot Handle**: `@TaskyAppbot` ([`https://t.me/TaskyAppbot`](https://t.me/TaskyAppbot))
- **Mini App Deep Link**: `https://t.me/TaskyAppbot/app`
- **Official Channel**: `@Tasky_Official` ([`https://t.me/Tasky_Official`](https://t.me/Tasky_Official))
- **Community Group**: `@TaskyOfficialCommunity` ([`https://t.me/TaskyOfficialCommunity`](https://t.me/TaskyOfficialCommunity))
- **Payout Proof Channel ID**: `-1003189912176`

---

## 3. Ad Network Providers & Monetization Config

| Provider | SDK / Unit ID | Configuration / Placement | Format |
| :--- | :--- | :--- | :--- |
| **Adexium** | WID: `e93d690f-bdc3-4ed5-8d9f-8f208afa3774` | Script: `https://cdn.tgads.space/assets/js/adexium-widget.min.js` | Interstitial & Rewarded |
| **USL Ads (TowerAds v4)** | Placement: `plc_c529a877186e2def`<br>API Key: `feb662719eb08611a669069ba17cb0e8` | Script: `https://uslads.com/sdk/tower-ads-v4.js` | Partner Rewarded Video |
| **GigaPub Primary** | Unit ID: `8093` | Script: `https://ad.gigapub.tech/script?id=8093` | High Fill Rewarded Video |
| **GigaPub Offerwall** | Project ID: `8093` | Script: `https://wall.giga.pub/api/v1/loader.js?projectId=8093` | Interactive Offerwall |

---

## 4. Complete Agent Deployment Workflow

Whenever an agent or developer updates the **Mini App** or **Admin Panel**, execute these exact steps in order:

```powershell
# STEP 1: Build Mini App
cd miniapp
npm run build
cd ..

# STEP 2: Deploy Mini App Static Assets to Vercel (for $0 Render Bandwidth)
npx vercel --prod --yes --cwd miniapp

# STEP 3: Copy Mini App build to backend public folder
Copy-Item -Path "miniapp\dist\*" -Destination "backend\public\app\" -Recurse -Force

# STEP 4: Build Admin Panel (if modified)
cd admin-frontend
npm run build
cd ..
npx vercel --prod --yes --cwd admin-frontend
Copy-Item -Path "admin-frontend\dist\*" -Destination "backend\public\admin\" -Recurse -Force

# STEP 5: Commit and Push to GitHub (Triggers Render Backend Deploy)
git add -A
git commit -m "Your descriptive commit message"
git push origin main
```

---

## 5. Important Rules & Gotchas for AI Agents

1. **Vercel + Render Hybrid**: Always deploy to Vercel (`npx vercel --prod --yes --cwd miniapp`) AND copy to `backend/public/app/`. This guarantees $0 Render bandwidth while keeping Render as the live entry host.
2. **Bot Links**: All broadcast buttons must use `https://t.me/TaskyAppbot/app` so Telegram launches the native Mini App directly without blank browser screens.
3. **Asynchronous Ads**: All ad script tags in `index.html` must remain `async` to prevent blocking the app launch.
