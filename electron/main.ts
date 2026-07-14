import { app, BrowserWindow, ipcMain, Menu } from "electron";
import fs from "node:fs";
import path from "node:path";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

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
