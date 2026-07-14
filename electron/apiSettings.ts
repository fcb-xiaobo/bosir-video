import fs from "node:fs";
import path from "node:path";
import type { App } from "electron";
import type { ApiStatus } from "./apiTypes";

type StoredSettings = {
  baseUrl?: string;
};

function getSettingsPath(app: App) {
  return path.join(app.getPath("userData"), "xiaobo-api-settings.json");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function createApiSettings(app: App) {
  const settingsPath = getSettingsPath(app);

  function readSettings(): StoredSettings {
    try {
      const text = fs.readFileSync(settingsPath, "utf8");
      const parsed = JSON.parse(text.replace(/^\uFEFF/, "")) as StoredSettings;
      return {
        baseUrl: typeof parsed.baseUrl === "string" ? normalizeBaseUrl(parsed.baseUrl) : ""
      };
    } catch {
      return {};
    }
  }

  function writeSettings(settings: StoredSettings) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  }

  return {
    getStatus(): ApiStatus {
      const baseUrl = readSettings().baseUrl ?? "";
      return {
        baseUrl,
        hasBaseUrl: baseUrl.length > 0
      };
    },
    setBaseUrl(baseUrl: string): ApiStatus {
      const normalized = normalizeBaseUrl(baseUrl);
      writeSettings({ baseUrl: normalized });
      return {
        baseUrl: normalized,
        hasBaseUrl: normalized.length > 0
      };
    }
  };
}
