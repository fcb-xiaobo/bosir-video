# XiaoBo Windows Client Phase 1 Design

## Goal

Build a Windows 10/11 desktop client for XiaoBo that can be installed or run on Windows, open normally, sign in, browse video content, search, view details, and watch videos. The first phase should feel like a real Windows client while keeping the Android app as the source of truth for business behavior and API discovery.

## Source Android App

Reference APK: `F:\study_apk\nativefix-final.apk`

Reference decompiled project: `F:\study_apk\apktool_deepfix`

Confirmed Android modules:

- Main entry: `com.salmon.film.main.ui.SplashActivity`
- User account: login, registration, account/password, phone/email verification, profile, messages
- Video: home/discovery, search, detail, player, comments, history, favorite, download screens
- Membership and privileges: `Me.isVip`, `Me.vip`, `VipData.level`, `VipData.type`, `VipData.typeName`, `VipData.startTime`, `VipData.endTime`, `Me.hasAccelerate`, `Me.displayExchange`
- Wallet and trade: pay, wallet, pay logs, trade logs, trade confirmation
- Playback/native assets: `libijkffmpeg.so`, `libijkplayer.so`, `libijksdl.so`, `librtmp-jni.so`, `libutil.so`, `libmmkv.so`

The Windows client will not run Android activities directly. It will reuse the Android app as a behavioral and API reference and reimplement the Windows UI and runtime.

## Phase 1 Scope

Phase 1 must deliver a Windows desktop app that can be launched on Windows 10 and Windows 11 and can play video.

Included:

- App shell with Windows desktop layout, left navigation, top search, main content area, and player window.
- Home/browse page with sections and video cards based on available API responses.
- Search page with keyword input and result list.
- Video detail page with title, cover, summary, episode/source selection, favorite action, and play action.
- Video playback page with play/pause, progress, volume, fullscreen, source switching, and basic playback error display.
- Login page with account/password login as the first supported mode.
- User panel with nickname/account state, VIP status, privilege status, history, and favorites.
- Local persistence for token/session, user profile, watch history, and favorites.
- API diagnostics page for domain status, login state, and last request error.

Deferred to Phase 2:

- Wallet recharge and trade flow.
- Full download/offline cache.
- DLNA/cast/TV projection.
- Scan login and QR flows.
- Comment posting and full message center.
- Full invitation/redeem workflow, beyond displaying visible status and available entry points.
- Auto update and installer signing.

## Technical Approach

Use Electron, React, and TypeScript.

Reasons:

- Electron supports Windows 10 and Windows 11 reliably.
- Chromium gives mature media playback and WebView-like UI behavior.
- Node side can manage filesystem persistence, downloads later, native player integration, and diagnostics.
- React makes it practical to rebuild Android-like pages as Windows-oriented views.

Initial playback strategy:

- Use HTML5 video first for HLS/MP4 sources that Chromium can handle.
- Add an internal player adapter boundary so Phase 1 can switch to `mpv` or `libvlc` if stream formats require it.
- The UI must report unsupported stream formats clearly instead of failing silently.

## Architecture

The app will be split into Electron main process, preload bridge, and React renderer.

Main process responsibilities:

- Create and manage the desktop window.
- Store secure-ish local app data under the Windows user profile.
- Expose safe IPC APIs for config, session storage, diagnostics, and future native player/download hooks.

Renderer responsibilities:

- Render pages and navigation.
- Call the typed API client.
- Manage UI state, loading states, and playback state.
- Keep history and favorites in local storage through a storage service.

Shared responsibilities:

- Define TypeScript data models based on Android data models such as `Me`, `VipData`, video item, video detail, source, episode, and simple API result wrappers.
- Keep API response parsing defensive because endpoints are inferred from the Android APK and may vary by domain.

## Core Data Models

Minimum Phase 1 models:

- `Session`: token, user id, login time, selected domain.
- `UserProfile`: id, nickname, avatar, isSignedIn, isVip, vip, hasAccelerate, inviteCode, inviteCount.
- `VipInfo`: level, type, typeName, startTime, endTime.
- `VideoCard`: id, title, cover, subtitle, tags, mark, route.
- `VideoDetail`: id, title, cover, summary, year, area, category, sources, episodes.
- `VideoSource`: id, name, episodes.
- `Episode`: id, title, sort, playUrl, route.
- `PlaybackState`: current video, source, episode, URL, status, error.
- `LocalRecord`: video id, title, cover, last watched time, last episode.

## API Strategy

The Android APK shows endpoints such as:

- `user/info`
- `user/accelerate`
- `v2/app/accelerate.capi`
- `v5/config/appInit.capi`
- `/vod/playUnits.capi`

Phase 1 will build an API client with:

- Domain bootstrap from extracted Android configuration where possible.
- Request signing/encryption hooks isolated in one module.
- Plain request/response logging in development mode.
- Timeout and retry for domain failure.
- A diagnostics page that displays active domain, last successful request, and last error.

If an endpoint needs native Android signing or `libutil.so` behavior, the Windows client must isolate that logic behind `ApiSigner`. Phase 1 may begin with transparent requests for endpoints that work directly and then fill signing behavior as each endpoint is confirmed.

## UI Design

Windows layout should not copy the phone UI one-to-one. It should adapt the same functions to desktop:

- Left rail: Home, Search, History, Favorites, My.
- Top bar: search box, login/VIP badge, diagnostics shortcut.
- Home: dense video rows/cards suitable for mouse use.
- Detail: cover and metadata on the left, episodes and sources on the right.
- Player: large playback surface, bottom controls, episode/source side panel.
- My: login state, VIP/privilege state, history/favorite shortcuts.

The app should be usable with mouse and keyboard, with text sized for desktop screens.

## Error Handling

- Startup failure shows a local diagnostics screen, not a blank window.
- API failure shows retry and active domain details.
- Login failure shows server message where available.
- Playback failure shows the URL type, source name, and a recommendation to switch source.
- Unsupported media format shows a clear message and leaves room to plug in `mpv/libvlc`.
- Token expiration returns the user to login while keeping local history/favorites.

## Security and Compliance Boundaries

- Store only the minimum session data needed to keep the app logged in.
- Do not hard-code user credentials.
- Keep domain/signing logic isolated so it can be audited.
- Do not modify server-side membership, payment, or entitlement rules. The Windows client displays and uses the entitlement state returned by server APIs.

## Testing Strategy

Phase 1 verification requires:

- App starts on Windows 10/11 development machine.
- Home shell renders without API data.
- Login form validates empty fields and handles mock success/failure.
- API client can be tested with mocked responses.
- User profile parser handles `isVip`, `vip`, and `hasAccelerate`.
- Video detail parser handles missing/empty source lists.
- Player page can load a known MP4/HLS test URL.
- Local history/favorites persist after restart.
- Packaged Windows build can launch from a folder.

## Success Criteria

Phase 1 is successful when:

- `F:\study_apk\xiaobo-windows-client` contains a standalone Windows client project.
- The app can be started in development mode.
- The app can be packaged for Windows.
- A user can open the app, log in if APIs are available, browse/search, open a detail page, and play a supported video URL.
- If a video URL is unsupported by Chromium, the app reports that clearly and the player adapter can be upgraded without rewriting the UI.

## Open Implementation Notes

- Start with an API mock layer so the Windows UI and player can be built and verified before every Android endpoint is fully decoded.
- Then replace mock endpoints one by one with real Android-compatible API calls.
- Keep Phase 1 focused on playback and viewing. Payment, download, cast, and complete invite workflows are intentionally deferred.
