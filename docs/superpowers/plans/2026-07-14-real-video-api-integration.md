# Real Video API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Windows client to real XiaoBo video APIs for home content, search, detail, episodes, and playback URL requests.

**Architecture:** Electron main process owns remote HTTP calls, API settings, request logging, and response normalization. The renderer calls a narrow preload bridge and renders loading/error/source states. Mock data remains only as a visible fallback when no base URL is configured or the real API fails.

**Tech Stack:** Electron, React, TypeScript, Vite, Node `fetch`, local JSON settings under Electron `userData`.

## Global Constraints

- Local project path stays at `F:\study_apk\xiaobo-windows-client`.
- Windows targets are Windows 10 and Windows 11.
- Remote repository is `git@github.com:fcb-xiaobo/bosir-video.git`.
- Video pass includes home, search, detail, episodes, and playback URL.
- Login, VIP entitlement mutation, wallet, payment, downloads, comments, and DLNA/cast are out of scope.
- Do not bypass login, VIP, payment, or entitlement checks.
- Real API failures must be visible in diagnostics and must not be silently hidden by mock data.
- Packaged app must be distributed through `npm run dist:zip`.

---

## File Structure

- `electron/apiTypes.ts`: Shared API request/response types used by main and preload.
- `electron/apiSettings.ts`: Reads and writes API base URL settings under Electron `userData`.
- `electron/videoApiGateway.ts`: Performs HTTP requests, endpoint tests, and response normalization.
- `electron/main.ts`: Registers IPC handlers for the API gateway.
- `electron/preload.ts`: Exposes `window.xiaoboApi`.
- `src/global.d.ts`: Renderer-side typing for preload APIs.
- `src/apiModels.ts`: Renderer-facing API model types.
- `src/App.tsx`: Replace direct mock reads with API-backed state and diagnostics controls.
- `src/styles.css`: Loading, error, and diagnostics form styling.
- `scripts/package-zip.ps1`: Existing packaging script; only touched if packaging output changes.
- `docs/RUNNING.md`: Add real API configuration instructions.

---

### Task 1: Main-Process API Settings and Bridge

**Files:**
- Create: `electron/apiTypes.ts`
- Create: `electron/apiSettings.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Create: `src/global.d.ts`

**Interfaces:**
- Produces: `ApiSettings`, `ApiStatus`, `ApiResult<T>`, `window.xiaoboApi.getApiStatus()`, `window.xiaoboApi.setApiBaseUrl(baseUrl)`.
- Consumes: Electron `app.getPath("userData")`.

- [ ] **Step 1: Create shared API types**

Create `electron/apiTypes.ts`:

```ts
export type ApiSource = "real" | "fallback";

export type ApiSettings = {
  baseUrl: string;
  fallbackEnabled: boolean;
};

export type ApiErrorCode =
  | "NO_BASE_URL"
  | "NETWORK_ERROR"
  | "HTTP_STATUS"
  | "INVALID_JSON"
  | "EMPTY_DATA"
  | "UNSUPPORTED_PLAY_URL";

export type ApiFailure = {
  ok: false;
  code: ApiErrorCode;
  message: string;
  url?: string;
  status?: number;
  durationMs?: number;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  source: ApiSource;
  url?: string;
  status?: number;
  durationMs?: number;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ApiStatus = {
  settings: ApiSettings;
  logPath: string;
  lastRequest?: {
    url: string;
    status?: number;
    durationMs: number;
    error?: string;
  };
};
```

- [ ] **Step 2: Create settings persistence**

Create `electron/apiSettings.ts`:

```ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { ApiSettings } from "./apiTypes";

const defaultSettings: ApiSettings = {
  baseUrl: "",
  fallbackEnabled: true
};

function settingsPath() {
  return path.join(app.getPath("userData"), "api-settings.json");
}

export function normalizeBaseUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Base URL must start with http:// or https://");
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function readApiSettings(): ApiSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ApiSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      fallbackEnabled: parsed.fallbackEnabled !== false
    };
  } catch {
    return defaultSettings;
  }
}

export function writeApiSettings(next: ApiSettings) {
  const settings: ApiSettings = {
    baseUrl: normalizeBaseUrl(next.baseUrl),
    fallbackEnabled: next.fallbackEnabled !== false
  };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
```

- [ ] **Step 3: Add IPC handlers in `electron/main.ts`**

Add imports:

```ts
import { readApiSettings, writeApiSettings } from "./apiSettings";
```

Add handlers after `ipcMain.handle("app:getVersion", ...)`:

```ts
ipcMain.handle("api:getStatus", () => ({
  settings: readApiSettings(),
  logPath: path.join(app.getPath("userData"), "xiaobo-windows.log")
}));

ipcMain.handle("api:setBaseUrl", (_event, baseUrl: string) => ({
  settings: writeApiSettings({ ...readApiSettings(), baseUrl }),
  logPath: path.join(app.getPath("userData"), "xiaobo-windows.log")
}));
```

- [ ] **Step 4: Expose preload bridge**

Modify `electron/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("xiaoboApp", {
  getVersion: () => ipcRenderer.invoke("app:getVersion")
});

contextBridge.exposeInMainWorld("xiaoboApi", {
  getApiStatus: () => ipcRenderer.invoke("api:getStatus"),
  setApiBaseUrl: (baseUrl: string) => ipcRenderer.invoke("api:setBaseUrl", baseUrl)
});
```

- [ ] **Step 5: Add renderer global types**

Create `src/global.d.ts`:

```ts
import type { ApiStatus } from "../electron/apiTypes";

declare global {
  interface Window {
    xiaoboApp: {
      getVersion: () => Promise<string>;
    };
    xiaoboApi: {
      getApiStatus: () => Promise<ApiStatus>;
      setApiBaseUrl: (baseUrl: string) => Promise<ApiStatus>;
    };
  }
}

export {};
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 7: Commit**

```powershell
git add electron/apiTypes.ts electron/apiSettings.ts electron/main.ts electron/preload.ts src/global.d.ts
git commit -m "feat: add api settings bridge"
```

---

### Task 2: Real Video API Gateway and Normalizers

**Files:**
- Create: `electron/videoApiGateway.ts`
- Modify: `electron/apiTypes.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/global.d.ts`
- Create: `src/apiModels.ts`

**Interfaces:**
- Consumes: `readApiSettings()`.
- Produces: `loadHome()`, `searchVideos(keyword)`, `loadVideoDetail(vodId)`, `loadEpisodes(params)`, `loadPlayUrl(params)`, `testEndpoint(endpoint)`.

- [ ] **Step 1: Add renderer model types**

Create `src/apiModels.ts`:

```ts
import type { VideoDetail, UserProfile } from "./types";

export type VideoCatalogResult = {
  videos: VideoDetail[];
  source: "real" | "fallback";
  message?: string;
};

export type DetailRequest = {
  vodId: string;
};

export type EpisodesRequest = {
  vodId: string;
  siteId?: string;
  episodeVodId?: string;
};

export type PlayUrlRequest = {
  vodId: string;
  episodeId?: string;
  episodeVodId?: string;
  siteId?: string;
};

export type DiagnosticsTestRequest = {
  endpoint: "appInit" | "home" | "search";
  keyword?: string;
};

export type UserPanelData = UserProfile;
```

- [ ] **Step 2: Extend shared API types**

Add to `electron/apiTypes.ts`:

```ts
export type VideoCardDto = {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  summary: string;
  tags: string[];
};

export type EpisodeDto = {
  id: string;
  title: string;
  playUrl?: string;
  raw?: unknown;
};

export type SourceDto = {
  id: string;
  name: string;
  episodes: EpisodeDto[];
  raw?: unknown;
};

export type VideoDetailDto = VideoCardDto & {
  sources: SourceDto[];
  raw?: unknown;
};
```

- [ ] **Step 3: Create gateway helpers**

Create `electron/videoApiGateway.ts` with these exported signatures:

```ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { readApiSettings } from "./apiSettings";
import type { ApiFailure, ApiResult, VideoDetailDto } from "./apiTypes";

let lastRequest: { url: string; status?: number; durationMs: number; error?: string } | undefined;

export function getLastRequest() {
  return lastRequest;
}

function logApi(message: string) {
  fs.appendFileSync(path.join(app.getPath("userData"), "xiaobo-windows.log"), `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

function unwrapData(payload: unknown): unknown {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return record.data ?? record.result ?? record.items ?? payload;
  }
  return payload;
}

function collectVodItems(value: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) collectVodItems(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const record = value as Record<string, unknown>;
  if (typeof record.title === "string" && (record.id || record.vodId)) {
    out.push(record);
  }
  for (const key of ["vods", "items", "list", "blocks", "data", "children"]) {
    if (key in record) collectVodItems(record[key], out);
  }
  return out;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mapVideo(item: unknown): VideoDetailDto {
  const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const id = asText(record.id ?? record.vodId, crypto.randomUUID());
  const title = asText(record.title, "未命名影片");
  const cover = asText(record.image ?? record.imagePath ?? record.cover, "");
  const summary = asText(record.summary ?? record.desc ?? record.description, "");
  const tags = [record.channelName, record.year, record.bottomLabel, record.topRightLabel]
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
  return {
    id,
    title,
    subtitle: tags.slice(0, 2).join(" / "),
    cover,
    summary,
    tags,
    sources: [],
    raw: item
  };
}

function endpointUrl(endpoint: string, query?: Record<string, string | undefined>) {
  const settings = readApiSettings();
  if (!settings.baseUrl) throw Object.assign(new Error("请先在诊断页配置接口 Base URL"), { code: "NO_BASE_URL" });
  const url = new URL(endpoint, settings.baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function requestJson(endpoint: string, query?: Record<string, string | undefined>): Promise<ApiResult<unknown>> {
  let url = "";
  const started = Date.now();
  try {
    url = endpointUrl(endpoint, query);
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "okhttp/4.12.0",
        "X-CDN": "1"
      },
      signal: AbortSignal.timeout(15000)
    });
    const durationMs = Date.now() - started;
    const text = await response.text();
    lastRequest = { url, status: response.status, durationMs };
    if (!response.ok) {
      return { ok: false, code: "HTTP_STATUS", message: `HTTP ${response.status}`, url, status: response.status, durationMs };
    }
    try {
      return { ok: true, data: JSON.parse(text), source: "real", url, status: response.status, durationMs };
    } catch {
      return { ok: false, code: "INVALID_JSON", message: "接口返回不是 JSON", url, status: response.status, durationMs };
    }
  } catch (error) {
    const durationMs = Date.now() - started;
    const failure: ApiFailure = {
      ok: false,
      code: (error as { code?: string }).code === "NO_BASE_URL" ? "NO_BASE_URL" : "NETWORK_ERROR",
      message: error instanceof Error ? error.message : String(error),
      url,
      durationMs
    };
    lastRequest = { url, durationMs, error: failure.message };
    logApi(`request failed ${JSON.stringify(failure)}`);
    return failure;
  }
}

export async function loadHome(): Promise<ApiResult<VideoDetailDto[]>> {
  const result = await requestJson("v6/vod/home.capi");
  if (!result.ok) return result;
  const items = collectVodItems(unwrapData(result.data)).map(mapVideo);
  if (!items.length) return { ok: false, code: "EMPTY_DATA", message: "首页接口没有解析到影片", url: result.url, status: result.status, durationMs: result.durationMs };
  return { ...result, data: items };
}

export async function searchVideos(keyword: string): Promise<ApiResult<VideoDetailDto[]>> {
  const result = await requestJson("vod/search/query", { keyword, key: keyword, q: keyword });
  if (!result.ok) return result;
  const items = collectVodItems(unwrapData(result.data)).map(mapVideo);
  if (!items.length) return { ok: false, code: "EMPTY_DATA", message: "搜索接口没有解析到影片", url: result.url, status: result.status, durationMs: result.durationMs };
  return { ...result, data: items };
}

export async function loadVideoDetail(vodId: string): Promise<ApiResult<VideoDetailDto>> {
  const result = await requestJson("v2/vod/detail.capi", { vodId });
  if (!result.ok) return result;
  return { ...result, data: mapVideo(unwrapData(result.data)) };
}

export async function testEndpoint(endpoint: "appInit" | "home" | "search", keyword = "test") {
  if (endpoint === "appInit") return requestJson("v5/config/appInit.capi");
  if (endpoint === "search") return searchVideos(keyword);
  return loadHome();
}
```

- [ ] **Step 4: Register gateway IPC handlers**

Modify `electron/main.ts` imports:

```ts
import { getLastRequest, loadHome, loadVideoDetail, searchVideos, testEndpoint } from "./videoApiGateway";
```

Add handlers:

```ts
ipcMain.handle("api:getStatus", () => ({
  settings: readApiSettings(),
  logPath: path.join(app.getPath("userData"), "xiaobo-windows.log"),
  lastRequest: getLastRequest()
}));

ipcMain.handle("api:loadHome", () => loadHome());
ipcMain.handle("api:searchVideos", (_event, keyword: string) => searchVideos(keyword));
ipcMain.handle("api:loadVideoDetail", (_event, vodId: string) => loadVideoDetail(vodId));
ipcMain.handle("api:testEndpoint", (_event, endpoint: "appInit" | "home" | "search", keyword?: string) => testEndpoint(endpoint, keyword));
```

Replace the earlier `api:getStatus` handler instead of registering it twice.

- [ ] **Step 5: Extend preload and globals**

Add to `window.xiaoboApi` in `electron/preload.ts` and `src/global.d.ts`:

```ts
loadHome: () => ipcRenderer.invoke("api:loadHome"),
searchVideos: (keyword: string) => ipcRenderer.invoke("api:searchVideos", keyword),
loadVideoDetail: (vodId: string) => ipcRenderer.invoke("api:loadVideoDetail", vodId),
testEndpoint: (endpoint: "appInit" | "home" | "search", keyword?: string) => ipcRenderer.invoke("api:testEndpoint", endpoint, keyword)
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add electron/videoApiGateway.ts electron/apiTypes.ts electron/main.ts electron/preload.ts src/global.d.ts src/apiModels.ts
git commit -m "feat: add real video api gateway"
```

---

### Task 3: Replace Mock-Only UI With API-Backed State

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `window.xiaoboApi.loadHome`, `window.xiaoboApi.searchVideos`, `window.xiaoboApi.loadVideoDetail`, `window.xiaoboApi.getApiStatus`, `window.xiaoboApi.setApiBaseUrl`, `window.xiaoboApi.testEndpoint`.
- Produces: UI that shows real/fallback data source and diagnostics.

- [ ] **Step 1: Add state fields in `App.tsx`**

Replace `visibleVideos` derived-only model with state:

```ts
const [videos, setVideos] = useState<VideoDetail[]>(mockVideos);
const [dataSource, setDataSource] = useState<"real" | "fallback">("fallback");
const [apiError, setApiError] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [baseUrlInput, setBaseUrlInput] = useState("");
const [diagnosticOutput, setDiagnosticOutput] = useState("");
```

- [ ] **Step 2: Add mapper in `App.tsx`**

Add:

```ts
function fromDto(video: VideoDetail): VideoDetail {
  return {
    ...video,
    cover: video.cover || "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=640&q=80",
    sources: video.sources.length ? video.sources : mockVideos[0].sources
  };
}
```

- [ ] **Step 3: Load home on startup**

Add:

```ts
const loadHome = async () => {
  setIsLoading(true);
  setApiError("");
  const result = await window.xiaoboApi.loadHome();
  if (result.ok) {
    const nextVideos = result.data.map(fromDto);
    setVideos(nextVideos);
    setSelectedVideo(nextVideos[0]);
    setCurrentUrl(nextVideos[0].sources[0]?.episodes[0]?.playUrl || "");
    setDataSource("real");
  } else {
    setApiError(result.message);
    setVideos(mockVideos);
    setDataSource("fallback");
  }
  setIsLoading(false);
};
```

Call `loadHome()` inside a `useEffect`.

- [ ] **Step 4: Search against API**

In the search input `onChange`, debounce is not required for this pass. On Enter or when the user clicks a search button, call:

```ts
const runSearch = async () => {
  const keyword = query.trim();
  if (!keyword) return loadHome();
  setIsLoading(true);
  setApiError("");
  const result = await window.xiaoboApi.searchVideos(keyword);
  if (result.ok) {
    setVideos(result.data.map(fromDto));
    setDataSource("real");
  } else {
    setApiError(result.message);
    setVideos(mockVideos.filter((video) =>
      [video.title, video.subtitle, video.summary, ...video.tags].some((text) => text.toLowerCase().includes(keyword.toLowerCase()))
    ));
    setDataSource("fallback");
  }
  setActivePage("search");
  setIsLoading(false);
};
```

- [ ] **Step 5: Load detail on card click**

Modify `openVideo`:

```ts
const openVideo = async (video: VideoDetail) => {
  setSelectedVideo(video);
  setCurrentUrl(video.sources[0]?.episodes[0]?.playUrl || "");
  setHistory((items) => Array.from(new Set([video.id, ...items])));
  setActivePage("home");
  const result = await window.xiaoboApi.loadVideoDetail(video.id);
  if (result.ok) {
    const detail = fromDto(result.data);
    setSelectedVideo(detail);
    setCurrentUrl(detail.sources[0]?.episodes[0]?.playUrl || currentUrl);
  } else {
    setApiError(result.message);
  }
};
```

- [ ] **Step 6: Render source and errors**

Add near the topbar:

```tsx
<div className={`sourceBadge ${dataSource}`}>{dataSource === "real" ? "真实接口" : "演示数据"}</div>
```

Add before video grid:

```tsx
{isLoading && <div className="notice">正在加载真实接口数据...</div>}
{apiError && <div className="errorNotice">接口错误：{apiError}</div>}
```

- [ ] **Step 7: Add diagnostics controls**

In diagnostics panel add:

```tsx
<input value={baseUrlInput} onChange={(event) => setBaseUrlInput(event.target.value)} placeholder="https://example.com/" />
<button onClick={async () => {
  const status = await window.xiaoboApi.setApiBaseUrl(baseUrlInput);
  setDiagnosticOutput(`已保存 Base URL: ${status.settings.baseUrl}`);
}}>保存 Base URL</button>
<button onClick={async () => setDiagnosticOutput(JSON.stringify(await window.xiaoboApi.testEndpoint("appInit"), null, 2))}>测试初始化</button>
<button onClick={async () => setDiagnosticOutput(JSON.stringify(await window.xiaoboApi.testEndpoint("home"), null, 2))}>测试首页</button>
<button onClick={async () => setDiagnosticOutput(JSON.stringify(await window.xiaoboApi.testEndpoint("search", query || "test"), null, 2))}>测试搜索</button>
<pre>{diagnosticOutput}</pre>
```

- [ ] **Step 8: Add CSS**

Add:

```css
.sourceBadge,
.notice,
.errorNotice {
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
}

.sourceBadge.real {
  background: rgba(46, 204, 113, 0.16);
  color: #86efac;
}

.sourceBadge.fallback,
.notice {
  background: rgba(245, 158, 11, 0.16);
  color: #fcd34d;
}

.errorNotice {
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
}

.panel pre {
  max-height: 260px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
```

- [ ] **Step 9: Verify**

Run:

```powershell
npm run build
npm run dist:zip
```

Expected: both pass.

- [ ] **Step 10: Commit**

```powershell
git add src/App.tsx src/styles.css
git commit -m "feat: render real api video data"
```

---

### Task 4: Playback URL Request and Error Reporting

**Files:**
- Modify: `electron/videoApiGateway.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/global.d.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PlayUrlRequest`.
- Produces: `window.xiaoboApi.loadPlayUrl(params)`.

- [ ] **Step 1: Add gateway function**

In `electron/videoApiGateway.ts` add:

```ts
export async function loadPlayUrl(params: { vodId: string; episodeId?: string; episodeVodId?: string; siteId?: string }): Promise<ApiResult<string>> {
  const result = await requestJson("vod/episodePlayUrl", {
    vodId: params.vodId,
    episodeId: params.episodeId,
    episodeVodId: params.episodeVodId,
    siteId: params.siteId
  });
  if (!result.ok) return result;
  const data = unwrapData(result.data);
  const record = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const playUrl = asText(record.url ?? record.playUrl ?? record.play_url ?? data, "");
  if (!playUrl) {
    return { ok: false, code: "EMPTY_DATA", message: "播放地址接口没有返回可用 URL", url: result.url, status: result.status, durationMs: result.durationMs };
  }
  return { ...result, data: playUrl };
}
```

- [ ] **Step 2: Add IPC/preload/global entries**

Add `api:loadPlayUrl` handler in `electron/main.ts`, and expose `loadPlayUrl` through `electron/preload.ts` and `src/global.d.ts`.

- [ ] **Step 3: Use play URL before setting video src**

In `App.tsx`, change episode button handler to:

```tsx
<button key={episode.id} onClick={async () => {
  const result = await window.xiaoboApi.loadPlayUrl({
    vodId: selectedVideo.id,
    episodeId: episode.id,
    episodeVodId: episode.id
  });
  if (result.ok) {
    setCurrentUrl(result.data);
    setApiError("");
  } else if (episode.playUrl) {
    setCurrentUrl(episode.playUrl);
    setApiError(`播放接口失败，使用剧集自带地址：${result.message}`);
  } else {
    setApiError(result.message);
  }
}}>
  {episode.title}
</button>
```

- [ ] **Step 4: Add video error display**

On `<video>` add:

```tsx
onError={() => setApiError("播放器无法播放当前地址，可能需要 HLS/mpv/libvlc 支持或接口返回了受限格式。")}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run build
npm run dist:zip
```

Expected: both pass.

- [ ] **Step 6: Commit**

```powershell
git add electron/videoApiGateway.ts electron/main.ts electron/preload.ts src/global.d.ts src/App.tsx
git commit -m "feat: request real playback urls"
```

---

### Task 5: Documentation and Packaged Smoke Test

**Files:**
- Modify: `docs/RUNNING.md`

**Interfaces:**
- Consumes: `npm run dist:zip`.
- Produces: user-facing steps for configuring a real API base URL.

- [ ] **Step 1: Document API setup**

Add to `docs/RUNNING.md`:

```md
## Configure Real Video API

Open the app, go to `诊断`, enter the current API base URL, and click `保存 Base URL`.

Then click:

- `测试初始化`
- `测试首页`
- `测试搜索`

If these tests pass, go back to `首页` and click refresh or restart the app. The badge should show `真实接口`.

If tests fail, copy the diagnostic output and the log file path shown on the page.
```

- [ ] **Step 2: Build and package**

Run:

```powershell
npm run dist:zip
```

Expected: `release\XiaoBo-Windows-0.1.0.zip` exists.

- [ ] **Step 3: Extract and launch**

Run:

```powershell
$zip = 'F:\study_apk\xiaobo-windows-client\release\XiaoBo-Windows-0.1.0.zip'
$dest = 'F:\study_apk\xiaobo-windows-client\release\real-api-smoke-test'
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
Start-Process -FilePath (Join-Path $dest 'XiaoBo-Windows-0.1.0\XiaoBo Windows.exe')
```

Expected: app opens and diagnostics page is usable.

- [ ] **Step 4: Commit**

```powershell
git add docs/RUNNING.md
git commit -m "docs: add real api configuration guide"
```

- [ ] **Step 5: Push**

```powershell
git push
```

## Self-Review

- Spec coverage: The plan covers API settings, endpoint diagnostics, home/search/detail/playback data flow, fallback visibility, packaging, and docs.
- Placeholder scan: No `TBD` or unresolved placeholder remains.
- Type consistency: API result, settings, DTO, preload, and renderer names are consistent across tasks.
