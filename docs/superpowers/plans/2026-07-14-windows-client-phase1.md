# XiaoBo Windows Client Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows 10/11 Electron client that launches locally, shows the core XiaoBo video browsing flow, and plays a supported video URL.

**Architecture:** Electron owns the native window and preload boundary. React renders the desktop UI and uses typed services for mock API data, local session state, history, favorites, and player state. Android APK behavior is treated as the reference for future API integration.

**Tech Stack:** Electron, React, TypeScript, Vite, CSS, HTML5 video.

## Global Constraints

- Local project path stays at `F:\study_apk\xiaobo-windows-client`.
- Remote repository is `git@github.com:fcb-xiaobo/bosir-video.git`.
- Windows targets are Windows 10 and Windows 11.
- Phase 1 prioritizes launch, browse/search/detail, login shell, user/VIP display, history/favorites, diagnostics, and playback.
- Wallet, downloads, DLNA/cast, scan login, comments, and full invite/redeem flows are deferred.
- Do not modify server-side membership, payment, or entitlement rules.

---

### Task 1: Repository Bootstrap

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Keep: `docs/superpowers/specs/2026-07-14-windows-client-phase1-design.md`
- Keep: `docs/superpowers/plans/2026-07-14-windows-client-phase1.md`

**Interfaces:**
- Produces: a Git repository rooted at `F:\study_apk\xiaobo-windows-client`.

- [x] **Step 1: Create repository metadata**

Create a README describing install, dev, build, and current phase scope.

- [x] **Step 2: Initialize git**

Run: `git init`

- [x] **Step 3: Configure remote**

Run: `git remote add origin git@github.com:fcb-xiaobo/bosir-video.git`

- [x] **Step 4: Commit docs and bootstrap files**

Run: `git add . && git commit -m "chore: bootstrap windows client repository"`

### Task 2: Electron React Shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, and `npm run package`.

- [x] **Step 1: Add Electron/Vite project files**

Use Vite for renderer build and Electron for the native shell.

- [x] **Step 2: Add app shell UI**

Implement left navigation, top search, page content, video detail, player panel, user panel, and diagnostics panel.

- [x] **Step 3: Add mock data**

Use typed mock video cards, detail records, user profile, and player URL so the app can be verified before real APIs are integrated.

- [x] **Step 4: Build**

Run: `npm run build`

### Task 3: Phase 1 Verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: scripts from `package.json`.
- Produces: documented verification commands.

- [x] **Step 1: Install dependencies**

Run: `npm install`

- [x] **Step 2: Typecheck and build**

Run: `npm run build`

- [x] **Step 3: Package app folder**

Run: `npm run package`

- [x] **Step 4: Push to remote**

Run: `git push -u origin main`

## Verification Result

- `npm install --no-audit --no-fund`: passed after clearing a partial `node_modules` install.
- `npm run build`: passed TypeScript and Vite production build.
- `npm run package`: passed and generated `release/win-unpacked/XiaoBo Windows.exe`.
- Executable smoke test: `XiaoBo Windows.exe` started successfully and did not exit early.
