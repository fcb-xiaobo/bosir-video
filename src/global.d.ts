import type {
  ApiStatus,
  EndpointTestResult,
  IpcResult,
  PlayUrlResult,
  VideoCardDto,
  VideoDetailResult,
  VideoListResult
} from "../electron/apiTypes";

declare global {
  interface Window {
    xiaoboApp: {
      getVersion: () => Promise<string>;
    };
    xiaoboApi: {
      getStatus: () => Promise<IpcResult<ApiStatus>>;
      setBaseUrl: (baseUrl: string) => Promise<IpcResult<ApiStatus>>;
      testEndpoint: () => Promise<IpcResult<EndpointTestResult>>;
      loadHome: () => Promise<IpcResult<VideoListResult>>;
      searchVideos: (keyword: string) => Promise<IpcResult<VideoListResult>>;
      loadVideoDetail: (video: VideoCardDto) => Promise<IpcResult<VideoDetailResult>>;
      loadPlayUrl: (params: { vodId: string; siteId?: string; episodeVodId?: string }) => Promise<IpcResult<PlayUrlResult>>;
    };
  }
}

export {};
