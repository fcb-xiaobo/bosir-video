export type ApiErrorCode =
  | "NO_BASE_URL"
  | "NETWORK_ERROR"
  | "HTTP_STATUS"
  | "INVALID_JSON"
  | "EMPTY_DATA"
  | "UNSUPPORTED_PLAY_URL";

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  detail?: string;
};

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorPayload };

export type ApiStatus = {
  baseUrl: string;
  hasBaseUrl: boolean;
};

export type ApiSource = "real" | "demo";

export type VideoCardDto = {
  id: string;
  title: string;
  cover: string;
  subtitle: string;
  tags: string[];
};

export type EpisodeDto = {
  id: string;
  title: string;
  playUrl?: string;
  siteId?: string;
  episodeVodId?: string;
};

export type VideoSourceDto = {
  id: string;
  name: string;
  episodes: EpisodeDto[];
};

export type VideoDetailDto = VideoCardDto & {
  summary: string;
  sources: VideoSourceDto[];
};

export type VideoListResult = {
  source: ApiSource;
  items: VideoCardDto[];
};

export type VideoDetailResult = {
  source: ApiSource;
  detail: VideoDetailDto;
};

export type PlayUrlResult = {
  source: ApiSource;
  playUrl: string;
};

export type EndpointTestResult = {
  ok: boolean;
  url: string;
  status?: number;
  itemCount?: number;
  message: string;
};
