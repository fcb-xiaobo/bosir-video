# Local Install and Run Guide

This guide explains how to run the XiaoBo Windows client on Windows 10/11.

## Project Location

Local path:

```powershell
F:\study_apk\xiaobo-windows-client
```

Git remote:

```powershell
git@github.com:fcb-xiaobo/bosir-video.git
```

## Quick Run

If the packaged output already exists, open this file directly:

```powershell
F:\study_apk\xiaobo-windows-client\release\win-unpacked\XiaoBo Windows.exe
```

PowerShell command:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
Start-Process '.\release\win-unpacked\XiaoBo Windows.exe'
```

## First-Time Source Setup

Open PowerShell and run:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
node -v
npm -v
npm install --no-audit --no-fund
```

Expected result:

- `node -v` prints the installed Node.js version.
- `npm -v` prints the installed npm version.
- `npm install --no-audit --no-fund` finishes without `npm ERR!`.

If Node.js is not installed, install the Windows LTS version from:

```text
https://nodejs.org/
```

Then close and reopen PowerShell.

## Development Run

Use this when you want to modify code and preview changes immediately:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
npm run electron:dev
```

This starts the Vite development server and opens the Electron desktop window.

Stop it with:

```powershell
Ctrl + C
```

## Build Verification

Use this to check TypeScript and production web assets:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
npm run build
```

Expected result:

```text
✓ built
```

## Package a Windows Runnable Folder

Use this to generate the Windows runnable folder:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
npm run package
```

Output path:

```powershell
F:\study_apk\xiaobo-windows-client\release\win-unpacked\XiaoBo Windows.exe
```

Run it:

```powershell
Start-Process '.\release\win-unpacked\XiaoBo Windows.exe'
```

## Update Local Code From GitHub

If the GitHub repo has newer code:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
git pull
npm install --no-audit --no-fund
npm run package
Start-Process '.\release\win-unpacked\XiaoBo Windows.exe'
```

## Fresh Clone on Another Computer

If this folder does not exist on a new computer:

```powershell
Set-Location 'F:\study_apk'
git clone git@github.com:fcb-xiaobo/bosir-video.git xiaobo-windows-client
Set-Location 'F:\study_apk\xiaobo-windows-client'
npm install --no-audit --no-fund
npm run package
Start-Process '.\release\win-unpacked\XiaoBo Windows.exe'
```

If SSH is not configured on that computer, use the GitHub HTTPS clone URL instead.

## Common Problems

### `npm.ps1 cannot be loaded`

PowerShell script execution is blocked. Run PowerShell as your normal user and execute:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then close and reopen PowerShell.

### `esbuild.exe EFTYPE` or dependency install fails

This usually means `node_modules` was partially downloaded or corrupted.

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
Remove-Item -LiteralPath '.\node_modules' -Recurse -Force
npm cache verify
npm install --no-audit --no-fund
```

### `rcedit` or executable resource edit fails during package

Close any running `XiaoBo Windows.exe`, remove the generated package folder, and package again:

```powershell
Set-Location 'F:\study_apk\xiaobo-windows-client'
Remove-Item -LiteralPath '.\release' -Recurse -Force
npm run package
```

The current project config uses local Electron runtime and disables Windows executable resource editing for a stable phase-1 package.

### App opens but video cannot play

Phase 1 uses a public test video URL and HTML5 playback. Check:

- The computer can access the internet.
- Windows firewall or company network is not blocking the video URL.
- Run `npm run electron:dev` to see development console output.

## Current Phase Notes

Phase 1 includes:

- Windows app launch.
- Home/browse shell.
- Search.
- Video detail.
- HTML5 video playback.
- User/VIP display.
- Local history and favorites shell.
- Diagnostics page.

Not yet connected in Phase 1:

- Real Android API login.
- Real video catalog API.
- Payment/wallet.
- Downloads.
- DLNA/cast.
- Comments and messages.
