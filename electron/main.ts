import { app, BrowserWindow, ipcMain, Menu } from "electron";
import fs from "node:fs";
import path from "node:path";
import { createApiSettings } from "./apiSettings";
import type { ApiErrorPayload, IpcResult } from "./apiTypes";
import { ApiGatewayError, createVideoApiGateway } from "./videoApiGateway";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
const apiSettings = createApiSettings(app);
const videoApiGateway = createVideoApiGateway({
  getBaseUrl: () => apiSettings.getStatus().baseUrl,
  log: writeLog
});

function writeLog(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(path.join(app.getPath("userData"), "xiaobo-windows.log"), line, "utf8");
  } catch {
    // Logging must never prevent the app from opening.
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "XiaoBo Windows",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    writeLog(`renderer console level=${level} ${sourceId}:${line} ${message}`);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeLog(`did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL}`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    writeLog(`did-finish-load url=${mainWindow?.webContents.getURL()}`);
  });

  if (isDev) {
    void mainWindow.loadURL("http://127.0.0.1:5173").catch((error) => {
      writeLog(`loadURL failed ${String(error)}`);
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    writeLog(`loading ${indexPath}`);
    void mainWindow.loadFile(indexPath).catch((error) => {
      writeLog(`loadFile failed ${String(error)}`);
    });
  }
}

ipcMain.handle("app:getVersion", () => app.getVersion());

function toApiError(error: unknown): ApiErrorPayload {
  if (error instanceof ApiGatewayError) {
    return {
      code: error.code,
      message: error.message,
      detail: error.detail
    };
  }

  return {
    code: "NETWORK_ERROR",
    message: error instanceof Error ? error.message : String(error)
  };
}

async function handleApi<T>(callback: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await callback() };
  } catch (error) {
    writeLog(`api failed ${String(error)}`);
    return { ok: false, error: toApiError(error) };
  }
}

ipcMain.handle("api:getStatus", () => handleApi(() => apiSettings.getStatus()));
ipcMain.handle("api:setBaseUrl", (_event, baseUrl: string) => handleApi(() => apiSettings.setBaseUrl(baseUrl)));
ipcMain.handle("api:testEndpoint", () => handleApi(() => videoApiGateway.testEndpoint()));
ipcMain.handle("api:loadHome", () => handleApi(() => videoApiGateway.loadHome()));
ipcMain.handle("api:searchVideos", (_event, keyword: string) => handleApi(() => videoApiGateway.searchVideos(keyword)));
ipcMain.handle("api:loadVideoDetail", (_event, video) => handleApi(() => videoApiGateway.loadVideoDetail(video)));
ipcMain.handle("api:loadPlayUrl", (_event, params) => handleApi(() => videoApiGateway.loadPlayUrl(params)));

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
