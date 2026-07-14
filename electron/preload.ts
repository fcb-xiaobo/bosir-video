import { contextBridge, ipcRenderer } from "electron";
import type {
  ApiStatus,
  EndpointTestResult,
  IpcResult,
  PlayUrlResult,
  VideoCardDto,
  VideoDetailResult,
  VideoListResult
} from "./apiTypes";

contextBridge.exposeInMainWorld("xiaoboApp", {
  getVersion: () => ipcRenderer.invoke("app:getVersion")
});

contextBridge.exposeInMainWorld("xiaoboApi", {
  getStatus: (): Promise<IpcResult<ApiStatus>> => ipcRenderer.invoke("api:getStatus"),
  setBaseUrl: (baseUrl: string): Promise<IpcResult<ApiStatus>> => ipcRenderer.invoke("api:setBaseUrl", baseUrl),
  testEndpoint: (): Promise<IpcResult<EndpointTestResult>> => ipcRenderer.invoke("api:testEndpoint"),
  loadHome: (): Promise<IpcResult<VideoListResult>> => ipcRenderer.invoke("api:loadHome"),
  searchVideos: (keyword: string): Promise<IpcResult<VideoListResult>> => ipcRenderer.invoke("api:searchVideos", keyword),
  loadVideoDetail: (video: VideoCardDto): Promise<IpcResult<VideoDetailResult>> =>
    ipcRenderer.invoke("api:loadVideoDetail", video),
  loadPlayUrl: (params: { vodId: string; siteId?: string; episodeVodId?: string }): Promise<IpcResult<PlayUrlResult>> =>
    ipcRenderer.invoke("api:loadPlayUrl", params)
});
