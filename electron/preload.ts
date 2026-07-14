import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("xiaoboApp", {
  getVersion: () => ipcRenderer.invoke("app:getVersion")
});
