# XiaoBo Windows Client

Windows 10/11 desktop client for XiaoBo video playback.

## Phase 1

This repository starts the native Windows client based on the working Android APK reference. Phase 1 focuses on the core viewing path:

- desktop app launch
- home/browse shell
- search
- video detail
- HTML5 video playback
- user/VIP status display
- local history/favorites shell
- diagnostics panel

Wallet, downloads, DLNA/cast, scan login, comments, and full invite/redeem flows are planned for later phases.

## Local Path

`F:\study_apk\xiaobo-windows-client`

## Scripts

```powershell
npm install
npm run dev
npm run build
npm run package
```

## Reference

- Design: `docs/superpowers/specs/2026-07-14-windows-client-phase1-design.md`
- Plan: `docs/superpowers/plans/2026-07-14-windows-client-phase1.md`
- Android reference APK: `F:\study_apk\nativefix-final.apk`
