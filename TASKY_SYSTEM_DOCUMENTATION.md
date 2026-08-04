# 🚀 TASKY — Complete System Architecture & In-Depth Technical Specification

> **Document Version:** 1.0.0  
> **Target Audience:** Developers, AI Agents, System Architects, and Administrators  
> **Ecosystem:** Telegram Mini App (TMA) • Node.js Backend • PostgreSQL • Vite/React Frontend • Admin Dashboard  

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema & Data Model](#4-database-schema--data-model)
5. [Backend Services & Core APIs](#5-backend-services--core-apis)
6. [Core Business Logic & Mechanics](#6-core-business-logic--mechanics)
   - 6.1 [The Vault & Mining System ("The Rig")](#61-the-vault--mining-system-the-rig)
   - 6.2 [Task & Mission Engine](#62-task--mission-engine)
   - 6.3 [Referral & Viral Growth Loops](#63-referral--viral-growth-loops)
   - 6.4 [Gamification: Daily Check-in & Spin Wheel](#64-gamification-daily-check-in--spin-wheel)
   - 6.5 [Wallet, Swap & Withdrawal Workflows](#65-wallet-swap--withdrawal-workflows)
   - 6.6 [Special Offers & Promotions](#66-special-offers--promotions)
   - 6.7 [Ad Monetization (Giga Network)](#67-ad-monetization-giga-network)
7. [Telegram Bot Integration & Polling](#7-telegram-bot-integration--polling)
8. [Frontend Applications](#8-frontend-applications)
   - 8.1 [Telegram Mini App (`miniapp`)](#81-telegram-mini-app-miniapp)
   - 8.2 [Admin Dashboard (`admin-frontend`)](#82-admin-dashboard-admin-frontend)
9. [Security, Anti-Sybil & Abuse Prevention](#9-security-anti-sybil--abuse-prevention)
10. [Environment Variables & Configuration](#10-environment-variables--configuration)
11. [Deployment, Maintenance & Operational Runbook](#11-deployment-maintenance--operational-runbook)

---

## 1. Executive Summary

**Tasky** is a full-featured, Web3-gamified **Task-to-Earn (T2E)** platform operating directly inside Telegram via the Telegram Mini App (TMA) standard. 

### Core Value Proposition:
- **For Users:** Complete social/sponsored missions, maintain login streaks, spin the lucky wheel, invite friends, run a hardware-styled token mining rig with compounding holding multipliers, and exchange accumulated `$TASKY` tokens for real crypto assets (USDT, DOGS, TON).
- **For the Platform:** Monetize through sponsored user actions, high-engagement ad impressions (rewarded ads), viral multi-tier referral growth, and a tokenized retention ecosystem that incentives users to hold off-chain balances for higher mining efficiency.

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Telegram Client
        TG_USER[Telegram User]
        TG_BOT[Tasky Telegram Bot @taskybot]
        TMA[Tasky Mini App React/Vite]
    end

    subgraph Admin Client
        ADMIN[Admin Web Dashboard]
    end

    subgraph Backend Infrastructure
        EXPRESS[Express.js API Server :3000]
        BOT_ENGINE[Telegram Bot Poller & Broadcaster]
        CRON_JOB[Scheduled Jobs / Tier Fallbacks]
        AUTH_MW[Admin Auth & Maintenance Middleware]
    end

    subgraph External Services
        TG_API[Telegram Bot API]
        GIGA_ADS[Giga Ad Network]
        TON_NET[TON Connect / Wallets]
    end

    subgraph Persistence Layer
        PG[(PostgreSQL Database)]
    end

    TG_USER -->|Interacts with| TG_BOT
    TG_BOT -->|Launches TMA| TMA
    TG_USER -->|Connects Wallet| TON_NET
    TMA -->|Plays Rewarded Ads| GIGA_ADS
    
    TMA -->|REST Requests| EXPRESS
    ADMIN -->|x-admin-password REST| EXPRESS
    
    EXPRESS --> AUTH_MW
    AUTH_MW --> EXPRESS
    EXPRESS --> PG
    
    BOT_ENGINE <-->|Webhook / Long-Polling| TG_API
    BOT_ENGINE -->|Verifies Channel Membership| TG_API
    BOT_ENGINE -->|HTML Broadcasts| TG_API
    
    CRON_JOB -->|Synchronizes Tiers| PG
```

---

## 3. Technology Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+), Express.js | Core API endpoints, routing, error handling, session management |
| **Database** | PostgreSQL (`pg` connection pool) | Relational data store, ACID transactions for financial ledger operations |
| **Bot Service** | `node-telegram-bot-api` | Chat commands (`/start`), inline buttons, channel membership verification, broadcasts |
| **Scheduling** | `node-cron` | Background safety-net jobs (tier recalibration, streak verifications) |
| **User Mini App** | React 18, Vite, TailwindCSS, Framer Motion, Lucide Icons | Responsive Telegram webview, fluid animations, 60fps countdown tickers |
| **Web3 / Wallet** | `@tonconnect/ui-react`, `@twa-dev/sdk` | TON wallet connection, deep linking, native haptic feedback |
| **Localization (i18n)** | Custom React Context (8 Languages: EN, AR, HI, RU, TR, ES, PT, ID) | Real-time multilingual switching across the interface |
| **Admin Panel** | React 18, Vite, TailwindCSS, React Router 6, React Hot Toast | Live KPI stats, review queues, user balances/bans, machine config, broadcasts |
| **Monetization** | Giga Ad Network SDK (`window.Giga`) | Rewarded ad display, daily view caps, ad verification endpoints |

---

## 4. Database Schema & Data Model

Tasky uses a structured relational PostgreSQL schema initialized in `backend/db.js`. Below is the complete schema map:

### 4.1 `users`
Primary ledger and state table for all registered members.
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    balance NUMERIC(18, 4) DEFAULT 0,
    total_earned NUMERIC(18, 4) DEFAULT 0,
    task_earnings NUMERIC(18, 4) DEFAULT 0,
    referral_earnings NUMERIC(18, 4) DEFAULT 0,
    referred_by BIGINT,
    total_referrals INT DEFAULT 0,
    valid_referrals INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_checkin TIMESTAMPTZ,
    spins_available INT DEFAULT 0,
    spins_used_today INT DEFAULT 0,
    last_spin_date DATE,
    wallet_address VARCHAR(255),
    is_banned BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    genesis_member BOOLEAN DEFAULT FALSE,
    withdrawal_ads_watched INT DEFAULT 0,
    total_ads_watched INT DEFAULT 0,
    has_unseen_approved_withdrawal BOOLEAN DEFAULT FALSE,
    withdrawal_popup_views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 `tasks` & `user_tasks`
Mission definition and individual submission tracking.
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    type VARCHAR(50) NOT NULL,              -- 'telegram', 'twitter', 'youtube', 'general', 'video'
    category VARCHAR(50) DEFAULT 'internal',-- 'internal', 'partner', 'sponsored'
    reward_tasky NUMERIC(18, 4) NOT NULL,
    action_url VARCHAR(500),
    verification_type VARCHAR(50) NOT NULL, -- 'auto_telegram', 'auto_referral', 'proof_screenshot', 'proof_username', 'timer_10s', 'auto_ad'
    telegram_chat_id VARCHAR(100),          -- Used for auto membership verification
    icon VARCHAR(50) DEFAULT 'Default',
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tasks (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    task_id INT REFERENCES tasks(id),
    status VARCHAR(50) DEFAULT 'pending',   -- 'pending', 'approved', 'rejected'
    proof_screenshot_url TEXT,
    proof_url TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(telegram_id, task_id)
);
```

### 4.3 `user_mining_state`, `mining_sessions` & `machines`
Powers the off-chain hardware mining rig and vault tier progression.
```sql
CREATE TABLE IF NOT EXISTS user_mining_state (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    mining_level INT DEFAULT 1,             -- 1: No Vault, 2: Bronze, 3: Silver, 4: Gold, 5: Diamond
    base_speed_per_hour NUMERIC(10, 4) DEFAULT 5.0,
    holding_stable_since TIMESTAMPTZ DEFAULT NOW(),
    efficiency_percent INT DEFAULT 100,     -- 100% up to 200% based on holding days
    last_recalculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mining_sessions (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expected_claim_at TIMESTAMPTZ NOT NULL, -- started_at + 4 hours
    claimed_at TIMESTAMPTZ,
    rate_used NUMERIC(10, 4) NOT NULL,      -- Snapshot of effective speed at session start
    tasky_earned NUMERIC(18, 4) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active'     -- 'active', 'claimed', 'abandoned'
);

CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rarity VARCHAR(50) NOT NULL,            -- 'common', 'rare', 'epic', 'legendary'
    min_holding NUMERIC(18, 4) NOT NULL,    -- Required balance to unlock
    speed_bonus_percent INT NOT NULL,       -- Additional % boost to mining speed
    icon_key VARCHAR(100) NOT NULL,
    reveal_at_holding NUMERIC(18, 4) NOT NULL, -- Balance threshold to reveal from mystery state
    sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_unlocked_machines (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    machine_id INT REFERENCES machines(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    is_seen BOOLEAN DEFAULT FALSE,
    UNIQUE(telegram_id, machine_id)
);
```

### 4.4 `swaps`, `withdrawals` & Settings Tables
Handles currency exchange, fee calculations, and system-wide configurations.
```sql
CREATE TABLE IF NOT EXISTS swaps (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    tasky_amount NUMERIC(18, 4) NOT NULL,
    receive_token VARCHAR(50) NOT NULL,     -- 'USDT', 'DOGS'
    receive_amount NUMERIC(18, 4) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',   -- 'pending', 'done', 'rejected'
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS swap_rates (
    id SERIAL PRIMARY KEY,
    token_name VARCHAR(50) UNIQUE NOT NULL,
    tasky_per_unit NUMERIC(18, 4) NOT NULL,
    min_tasky NUMERIC(18, 4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_settings (
    id SERIAL PRIMARY KEY,
    min_withdrawal_tasky NUMERIC(18, 4) DEFAULT 1000,
    fee_percent NUMERIC(5, 2) DEFAULT 35.0,
    usdt_rate NUMERIC(18, 8) DEFAULT 0.00003,
    is_locked BOOLEAN DEFAULT FALSE,
    unlock_message TEXT,
    target_users_milestone INT DEFAULT 500000
);

CREATE TABLE IF NOT EXISTS referral_rules (
    id SERIAL PRIMARY KEY,
    reward_per_referral NUMERIC(18, 4) DEFAULT 200,
    tasks_required_for_valid INT DEFAULT 3,
    spin_reward_per_referral INT DEFAULT 2
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Backend Services & Core APIs

The backend server entry point is `backend/index.js`, serving modular Express router files mounted under `/api`.

### API Route Index

| Mount Path | Route File | Primary Endpoints | Description |
| :--- | :--- | :--- | :--- |
| `/api/users` | `routes/users.js` | `POST /register`, `GET /:id`, `POST /checkin`, `POST /wallet/bind`, `POST /wallet/disconnect`, `GET /special-offer/status/:id`, `POST /special-offer/claim` | User profile initialization, streaks, wallet binding, limited-time special promotions |
| `/api/mining` | `routes/mining.js` | `GET /status/:id`, `GET /levels`, `POST /start`, `POST /claim`, `GET /machines/:id`, `POST /machines/mark-seen` | Rig status, 4-hr session start/claim, machine unlocks and reveal queues |
| `/api/tasks` | `routes/tasks.js` | `GET /`, `POST /complete`, `GET /my-submissions/:id`, `GET /latest-post` | Task fetching, automated auto-verifications, manual proof upload, post resolution |
| `/api/spin` | `routes/spin.js` | `POST /play` | Daily lucky wheel execution with cryptographically seeded reward odds |
| `/api/referral` | `routes/referral.js` | `GET /:id`, `GET /leaderboard` | Referral counts, valid referral calculations, weekly leaderboard rankings |
| `/api/swap` | `routes/swap.js` | `GET /rates`, `POST /request`, `GET /history/:id`, `POST /notify-usdt-unlock` | Swapping TASKY for USDT/DOGS, anti-fraud checks, transaction histories |
| `/api/withdrawal` | `routes/withdrawal.js` | `GET /settings`, `POST /request`, `GET /history/:id`, `POST /watch_ad` | Legacy withdrawal channels, fee deductions, ad watch counters |
| `/api/admin` | `routes/admin.js` | `GET /stats`, `GET/POST /config`, `GET/POST /tasks/*`, `GET/POST /withdrawals/*`, `GET/POST /users/*`, `POST /broadcast`, `GET/POST /machines`, `GET/POST /system/maintenance` | Full admin management suite protected by `x-admin-password` |

---

## 6. Core Business Logic & Mechanics

### 6.1 The Vault & Mining System ("The Rig")

The Rig is designed to convert passive users into long-term balance holders. Rather than relying on external smart contracts, it uses high-frequency **off-chain balance synchronization** with instantaneous tier recalibration.

```
Total Mining Speed = (Base Speed * Holding Efficiency Multiplier) + Hardware Machine Bonuses
```

#### 1. Vault Levels (Based on current `$TASKY` balance)
| Level | Name | Min Balance Required | Base Speed |
| :---: | :--- | :---: | :---: |
| **1** | No Vault | 0 TASKY | 5.0 TASKY / hr |
| **2** | Bronze Vault | 500 TASKY | 8.0 TASKY / hr |
| **3** | Silver Vault | 2,000 TASKY | 14.0 TASKY / hr |
| **4** | Gold Vault | 5,000 TASKY | 25.0 TASKY / hr |
| **5** | Diamond Vault | 15,000 TASKY | 45.0 TASKY / hr |

#### 2. Efficiency Tiers (Holding Stability / Loyalty Multiplier)
Tracks how many consecutive days the user has maintained or grown their balance without major dumps:
- **0–3 Days:** 100% Multiplier (1.0x)
- **4–7 Days:** 110% Multiplier (1.1x)
- **8–14 Days:** 125% Multiplier (1.25x)
- **15–29 Days:** 150% Multiplier (1.5x)
- **30+ Days:** 200% Multiplier (2.0x Double Speed)

#### 3. Hardware Machines
Hardware rigs (Starter Rig, Copper Frame, Ion Core, Quantum Matrix, Titan Core) are unlocked automatically as the user reaches balance milestones. Unseen unlocked machines trigger dynamic celebratory modals on the user's next visit.

#### 4. Recalibration Engine (`utils/recalculateMachineTier.js`)
Whenever a user performs a balance-altering action (task approved, spin won, mining claimed, swap completed, admin balance edit), `recalculateTier(telegram_id)` is invoked synchronously inside the SQL transaction to immediately update levels and trigger new machine unlocks.

---

### 6.2 Task & Mission Engine

Missions incentivize social actions and monetization:

1. **`auto_telegram`**: Calls Telegram Bot API `getChatMember(chat_id, user_id)` to verify if the user is `member`, `administrator`, or `creator`. Provides a 10-second timer buffer.
2. **`auto_referral`**: Checks `users.valid_referrals` against required counts.
3. **`auto_ad`**: Verifies that the user completed watching a rewarded video ad via the Giga network integration before awarding tokens.
4. **`proof_username` / `proof_screenshot`**: Submits to the Admin Review Queue (`user_tasks` with status `'pending'`). Admin approval immediately credits the user balance.
5. **`timer_10s`**: Client timer enforcement before submission.

---

### 6.3 Referral & Viral Growth Loops

Tasky features a **2-Tier anti-cheat referral validation architecture**:
- When a new user registers via `https://t.me/taskybot?start=TASKY<telegram_id>`, the referrer's `total_referrals` increments by 1.
- **Validation Threshold:** A referral is only marked as **Valid** (`valid_referrals + 1`) once the referee completes at least **3 verified missions** (`referral_rules.tasks_required_for_valid`).
- **Rewards Granted Upon Validation:**
  - 200 `$TASKY` added to referrer's balance.
  - 2 Free Lucky Spins added to referrer's account.
- **Weekly Leaderboard:** Resets every Wednesday at 00:00 UTC with prizes for top referrers.

---

### 6.4 Gamification: Daily Check-in & Spin Wheel

#### Daily Check-In
- 7-Day recurring streak cycle awarding escalating rewards (10 TASKY on Day 1 up to 100 TASKY on Day 6).
- **Milestone Bonuses:** Day 7 (100 TASKY), Day 14 (200 TASKY), Day 21 (350 TASKY), Day 30 (500 TASKY).
- Missing a 24–48 hour window resets the streak counter back to Day 1.

#### Lucky Spin Wheel
- Rewards seeded across 4 probability tiers:
  - **Jackpot (1%):** 500–1,000 TASKY
  - **Rare (15%):** 200–350 TASKY
  - **Medium (34%):** 50–150 TASKY
  - **Common (50%):** 10–30 TASKY
- Free spins regenerate daily (max 1 free spin/day), additional spins earned via referrals or admin gifts.

---

### 6.5 Wallet, Swap & Withdrawal Workflows

```mermaid
sequenceDiagram
    autonumber
    actor User as Telegram User
    participant App as Mini App Frontend
    participant Server as Backend API
    participant DB as PostgreSQL
    actor Admin as Admin Dashboard

    User->>App: Connect TON Wallet / Input BSC
    App->>Server: POST /api/users/wallet/bind
    Server->>DB: Save wallet_address
    
    User->>App: Submit Swap Request (e.g. 5,000 TASKY -> USDT)
    App->>Server: POST /api/swap/request
    Note over Server: Check min swap, balance, and anti-bot rules (>=5 refs or >=200 ads)
    Server->>DB: Deduct balance & insert pending swap record
    Server-->>App: Return Swap Pending
    
    Admin->>Server: Review Pending Swap in Admin Panel
    alt Approve Swap
        Admin->>Server: POST /api/admin/withdrawals/review (action: approve)
        Server->>DB: Update swap status='done' & set has_unseen_approved_withdrawal=TRUE
        Note over User: User opens app -> sees celebratory payout popup!
    else Reject Swap
        Admin->>Server: POST /api/admin/withdrawals/review (action: reject, reason)
        Server->>DB: Update status='rejected' & Refund TASKY balance to user
    end
```

---

### 6.6 Special Offers & Promotions

- **"Invite 20 Get 20,000 TASKY":** A 24-hour countdown promotion presented via an animated floating bubble (`SpecialOfferPopup.jsx`).
- Tracks when the user first views the offer via `localStorage` and backend timestamps.
- When `valid_referrals >= 20`, enables the **"Claim 20,000 TASKY"** button, sending a claim to the admin review queue.

---

### 6.7 Ad Monetization (Giga Network)

- Integrated via `miniapp/src/adUtils.js` and `window.Giga`.
- When users trigger ad-gated features (e.g., ad tasks, withdrawal unlocks, extra spins), the frontend invokes `window.Giga.showRewarded()`.
- Successful completions invoke `POST /api/withdrawal/watch_ad`, inserting records into `ad_views` and incrementing `users.total_ads_watched` and `users.withdrawal_ads_watched`.

---

## 7. Telegram Bot Integration & Polling

Implemented in `backend/bot.js`:
- Uses long polling via `node-telegram-bot-api`.
- **Command Handling (`/start`):**
  - Parses referral start parameters (`/start TASKY123456`).
  - Welcomes users with custom rich formatting and an inline **"Open Tasky 🚀"** WebApp launcher button.
- **Admin Commands:** Provides `/stats` and `/admin` links directly in Telegram.
- **Channel Membership Check:** Exposes `checkUserMembership(chatId, telegramId)` for instant mission completion verification.
- **Broadcast Delivery:** Handles throttled batch HTML message delivery (50ms interval per user to respect Telegram rate limits).

---

## 8. Frontend Applications

### 8.1 Telegram Mini App (`miniapp`)
- **Location:** `d:\antigravity\Tasky\miniapp`
- **Routing & Navigation:** Tab-based stateful switcher (`Home`, `Rig`, `Tasks`, `Referral`, `Wallet`, `Profile`).
- **Design System:** Custom Dark/Cyber Web3 theme, Tailwind tokens (`bg-surface`, `bg-primary`, `ink`, `ink-soft`), Framer Motion micro-interactions, hardware rig glowing SVG animations.
- **Key Components:**
  - `Rig.jsx`: Dynamic real-time mining counter running on a 50ms recursive timeout, particle-boost animations, 3D hardware machine carousels.
  - `Tasks.jsx`: Multi-category mission switcher with clipboard GM copy helpers, auto-refresh hooks, proof upload dialogs.
  - `Wallet.jsx`: TON Connect wallet binding, multi-currency swap simulator, anti-bot ad gating.
  - `SpecialOfferPopup.jsx`: Floating 24hr countdown bubble with modal claim drawer.
  - `WithdrawalPopup.jsx`: Celebratory payout notification modal.

### 8.2 Admin Dashboard (`admin-frontend`)
- **Location:** `d:\antigravity\Tasky\admin-frontend`
- **Authentication:** Protected by `ADMIN_PASSWORD` sent in `x-admin-password` HTTP header.
- **Dashboard Pages:**
  1. **Overview Dashboard (`Dashboard.jsx`):** Circulating supply, active users, pending tasks, total ads viewed.
  2. **Task Reviews (`TaskReviews.jsx`):** Image zoom modal, single-click approve, reject with custom reasons, bulk approve.
  3. **Withdrawals / Swaps (`Withdrawals.jsx`):** Process crypto payouts, auto-refund on reject.
  4. **User Management (`Users.jsx`):** Search, balance modification, spin gifts, ban/unban toggles.
  5. **Task Management (`TaskManagement.jsx`):** Create/delete live tasks and adjust reward amounts.
  6. **Machine Catalog (`Machines.jsx`):** Configure rig tier holding requirements and speed boosts.
  7. **Broadcast Tool (`Broadcast.jsx`):** Send rich HTML messages to all non-banned users.
  8. **Dynamic Settings (`Settings.jsx`):** Toggle global maintenance mode, change fee percentages, update referral rules.

---

## 9. Security, Anti-Sybil & Abuse Prevention

1. **Anti-Sybil Withdrawal Gate:** Users must satisfy at least one proof-of-work criterion before submitting swaps (e.g., minimum 5 valid referrals or 200 rewarded ads watched).
2. **Referral Multi-Step Validation:** Referral rewards are locked until the invited account completes 3+ distinct missions.
3. **Admin Token Authorization:** All administrative endpoints are guarded by strict header checks (`x-admin-password`).
4. **Maintenance Lockdown:** Global middleware (`backend/index.js`) blocks all non-admin traffic with HTTP `503 Service Unavailable` when maintenance mode is active.
5. **Rate Limiting & Broadcast Throttle:** Broadcast routines incorporate async delay buffers to adhere strictly to Telegram's 30 msg/sec broadcast threshold.
6. **SQL Parameterization:** 100% of database queries utilize parameterized `$1, $2` inputs to eliminate SQL injection vectors.

---

## 10. Environment Variables & Configuration

### Backend `.env` (`d:\antigravity\Tasky\backend\.env`)
```ini
# Server Port
PORT=3000

# PostgreSQL Connection String
DATABASE_URL=postgres://username:password@localhost:5432/taskydb

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_BOT_USERNAME=TaskyOfficialBot

# WebApp URL (Hosted Mini App Endpoint)
MINIAPP_URL=https://app.tasky.io

# Admin Panel Security
ADMIN_PASSWORD=SuperSecretAdminPassword123!
```

### Miniapp `.env` (`d:\antigravity\Tasky\miniapp\.env`)
```ini
VITE_API_URL=https://api.tasky.io
VITE_BOT_USERNAME=TaskyOfficialBot
```

### Admin Frontend `.env` (`d:\antigravity\Tasky\admin-frontend\.env`)
```ini
VITE_API_URL=https://api.tasky.io
```

---

## 11. Deployment, Maintenance & Operational Runbook

### Running Locally for Development
1. **Database Setup:**
   Ensure PostgreSQL is running and `DATABASE_URL` is set in `backend/.env`. The database tables will self-initialize on server boot via `backend/db.js`.
2. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev # or node index.js
   ```
3. **Start Mini App:**
   ```bash
   cd miniapp
   npm install
   npm run dev
   ```
4. **Start Admin Panel:**
   ```bash
   cd admin-frontend
   npm install
   npm run dev
   ```

### Production Checklist
- [ ] Ensure `ADMIN_PASSWORD` in `.env` is a high-entropy secret.
- [ ] Connect production PostgreSQL instance with SSL enabled.
- [ ] Register Telegram Bot domain via `@BotFather` `/setdomain` matching the Mini App hosting URL.
- [ ] Configure HTTPS/SSL certificates (Telegram Mini Apps require HTTPS).
- [ ] Configure cron jobs or process managers (PM2 / Docker) to keep `backend/index.js` alive.

---

*(End of Technical Specification)*
