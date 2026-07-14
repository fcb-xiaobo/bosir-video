import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createApiSettings } from "./apiSettings";

const tempDirs: string[] = [];

function fakeApp(userData: string) {
  return {
    getPath(name: string) {
      if (name !== "userData") throw new Error(`unexpected path ${name}`);
      return userData;
    }
  };
}

describe("api settings", () => {
  afterEach(() => {
    tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
  });

  test("reads settings files that include a UTF-8 BOM", () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), "xiaobo-settings-"));
    tempDirs.push(userData);
    fs.writeFileSync(
      path.join(userData, "xiaobo-api-settings.json"),
      "\uFEFF" + JSON.stringify({ baseUrl: "https://api.example.com/" }),
      "utf8"
    );

    const settings = createApiSettings(fakeApp(userData) as never);

    expect(settings.getStatus()).toEqual({
      baseUrl: "https://api.example.com",
      hasBaseUrl: true
    });
  });
});
