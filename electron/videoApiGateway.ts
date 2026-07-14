import type {
  EndpointTestResult,
  PlayUrlResult,
  VideoSourceDto,
  VideoCardDto,
  VideoDetailDto,
  VideoDetailResult,
  VideoListResult
} from "./apiTypes";
import type { ApiErrorCode } from "./apiTypes";

type FetchResponseLike = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<FetchResponseLike>;

type GatewayOptions = {
  getBaseUrl: () => string;
  fetchImpl?: FetchLike;
  log?: (message: string) => void;
};

const DEFAULT_COVER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='480'><rect width='100%25' height='100%25' fill='%23171c29'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238f98ad' font-family='Arial' font-size='24'>No Cover</text></svg>";

export class ApiGatewayError extends Error {
  code: ApiErrorCode;
  detail?: string;

  constructor(code: ApiErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "ApiGatewayError";
    this.code = code;
    this.detail = detail;
  }
}

export function buildApiUrl(baseUrl: string, endpointPath: string, query?: Record<string, string | number | undefined>) {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = endpointPath.replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return "";
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function collectRecords(value: unknown, records: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRecords(item, records));
    return records;
  }

  if (!isRecord(value)) return records;

  const id = pickString(value, ["id", "vodId", "videoId"]);
  const title = pickString(value, ["title", "vodName", "name"]);
  const cover = pickString(value, ["image", "imagePath", "cover", "poster", "pic"]);

  if (id && title && cover) {
    records.push(value);
  }

  Object.values(value).forEach((item) => collectRecords(item, records));
  return records;
}

export function normalizeVodItems(payload: unknown): VideoCardDto[] {
  const seen = new Set<string>();
  const records = collectRecords(isRecord(payload) && "data" in payload ? payload.data : payload);

  return records
    .map((record) => {
      const id = pickString(record, ["id", "vodId", "videoId"]);
      const title = pickString(record, ["title", "vodName", "name"]);
      const cover = pickString(record, ["image", "imagePath", "cover", "poster", "pic"]) || DEFAULT_COVER;
      const tags = uniqueNonEmpty([
        pickString(record, ["channelName", "categoryName", "typeName"]),
        pickString(record, ["area"]),
        pickString(record, ["language"]),
        pickString(record, ["year"]),
        pickString(record, ["topRightLabel"]),
        pickString(record, ["topLeftLabel"]),
        pickString(record, ["bottomLabel"]),
        pickString(record, ["scoreText", "score"])
      ]).slice(0, 4);

      return {
        id,
        title,
        cover,
        subtitle: tags.join(" · ") || "真实接口",
        tags: tags.length ? tags : ["真实接口"]
      };
    })
    .filter((video) => {
      if (!video.id || !video.title || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
}

function collectEpisodeRecords(value: unknown, siteId?: string, records: VideoSourceDto["episodes"] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEpisodeRecords(item, siteId, records));
    return records;
  }

  if (!isRecord(value)) return records;

  const episodeVodId = pickString(value, ["episodeVodId", "episodeId"]);
  const directPlayUrl = pickString(value, ["playUrl", "url", "videoUrl", "m3u8"]);
  const looksLikeEpisode = Boolean(episodeVodId || directPlayUrl);

  if (looksLikeEpisode) {
    const id = episodeVodId || pickString(value, ["id", "vodId"]) || `episode-${records.length + 1}`;
    records.push({
      id,
      title: pickString(value, ["title", "name", "episodeName", "vodName"]) || `第 ${records.length + 1} 集`,
      playUrl: directPlayUrl || undefined,
      siteId: pickString(value, ["siteId", "sourceId", "playSourceId"]) || siteId,
      episodeVodId: episodeVodId || id
    });
    return records;
  }

  Object.values(value).forEach((item) => collectEpisodeRecords(item, siteId, records));
  return records;
}

function getArrayField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeSources(item: Record<string, unknown>, fallbackId: string): VideoSourceDto[] {
  const sourceRecords = getArrayField(item, ["playSources", "sources", "playSourceList", "sites"]);
  const sources = sourceRecords
    .filter(isRecord)
    .map((source, index) => {
      const id = pickString(source, ["siteId", "sourceId", "playSourceId", "id"]) || `source-${index + 1}`;
      const episodes = collectEpisodeRecords(source, id);
      return {
        id,
        name: pickString(source, ["name", "siteName", "sourceName", "title"]) || `线路 ${index + 1}`,
        episodes
      };
    })
    .filter((source) => source.episodes.length > 0);

  if (sources.length > 0) return sources;

  const fallbackEpisodes = collectEpisodeRecords(item);
  return [
    {
      id: pickString(item, ["siteId", "sourceId"]) || "default",
      name: pickString(item, ["siteName", "sourceName", "channelName"]) || "默认线路",
      episodes: fallbackEpisodes.length
        ? fallbackEpisodes
        : [
            {
              id: fallbackId,
              title: "播放",
              episodeVodId: fallbackId
            }
          ]
    }
  ];
}

export function normalizeVideoDetail(payload: unknown, fallback?: VideoCardDto): VideoDetailDto {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const item = isRecord(data) ? data : {};
  const fromList = normalizeVodItems(payload)[0];
  const card = fromList ?? fallback;

  if (!card) {
    throw new ApiGatewayError("EMPTY_DATA", "详情接口没有返回可识别的影片信息");
  }

  const summary = pickString(item, ["summary", "description", "desc", "shareText"]) || card.subtitle;

  return {
    ...card,
    summary,
    sources: normalizeSources(item, card.id)
  };
}

function collectPlayableStrings(value: unknown, results: string[] = []) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isMedia = /^https?:\/\//i.test(trimmed) && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(trimmed);
    if (isMedia) results.push(trimmed);
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPlayableStrings(item, results));
    return results;
  }

  if (isRecord(value)) {
    ["playUrl", "url", "videoUrl", "m3u8", "play_url", "path"].forEach((key) => collectPlayableStrings(value[key], results));
    Object.values(value).forEach((item) => collectPlayableStrings(item, results));
  }

  return results;
}

export function normalizePlayUrl(payload: unknown) {
  const url = collectPlayableStrings(payload)[0];
  if (!url) {
    throw new ApiGatewayError("UNSUPPORTED_PLAY_URL", "播放地址接口没有返回可播放链接");
  }
  return url;
}

function ensureBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new ApiGatewayError("NO_BASE_URL", "还没有配置真实接口地址，请先在诊断页填写 API 根地址");
  }
  return normalized;
}

export function createVideoApiGateway({ getBaseUrl, fetchImpl = globalThis.fetch as FetchLike, log }: GatewayOptions) {
  async function requestJson(endpointPath: string, query?: Record<string, string | number | undefined>) {
    const baseUrl = ensureBaseUrl(getBaseUrl());
    const url = buildApiUrl(baseUrl, endpointPath, query);
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "okhttp/4.12.0"
    };

    if (endpointPath.endsWith(".capi")) {
      headers["X-CDN"] = "1";
    }

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(url, { headers });
    } catch (error) {
      throw new ApiGatewayError("NETWORK_ERROR", "接口请求失败，请检查 API 地址和网络", String(error));
    }

    const text = await response.text();
    if (!response.ok) {
      throw new ApiGatewayError("HTTP_STATUS", `接口返回 HTTP ${response.status}`, text.slice(0, 400));
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiGatewayError("INVALID_JSON", "接口没有返回 JSON 数据", text.slice(0, 400));
    }
  }

  return {
    async testEndpoint(): Promise<EndpointTestResult> {
      const baseUrl = ensureBaseUrl(getBaseUrl());
      const url = buildApiUrl(baseUrl, "v6/vod/home.capi");
      try {
        const payload = await requestJson("v6/vod/home.capi");
        const items = normalizeVodItems(payload);
        return {
          ok: items.length > 0,
          url,
          itemCount: items.length,
          message: items.length > 0 ? `接口可用，识别到 ${items.length} 个视频` : "接口可访问，但没有识别到视频数据"
        };
      } catch (error) {
        log?.(`testEndpoint failed ${String(error)}`);
        return {
          ok: false,
          url,
          message: error instanceof Error ? error.message : String(error)
        };
      }
    },
    async loadHome(): Promise<VideoListResult> {
      const payload = await requestJson("v6/vod/home.capi");
      const items = normalizeVodItems(payload);
      if (items.length === 0) {
        throw new ApiGatewayError("EMPTY_DATA", "首页接口没有返回可识别的视频列表");
      }
      return { source: "real", items };
    },
    async searchVideos(keyword: string): Promise<VideoListResult> {
      const payload = await requestJson("vod/search/query", { keyword });
      const items = normalizeVodItems(payload);
      return { source: "real", items };
    },
    async loadVideoDetail(video: VideoCardDto): Promise<VideoDetailResult> {
      const payload = await requestJson("v2/vod/detail.capi", { vodId: video.id });
      return { source: "real", detail: normalizeVideoDetail(payload, video) };
    },
    async loadPlayUrl(params: { vodId: string; siteId?: string; episodeVodId?: string }): Promise<PlayUrlResult> {
      const payload = await requestJson("vod/episodePlayUrl", {
        vodId: params.vodId,
        siteId: params.siteId,
        episodeVodId: params.episodeVodId
      });
      return { source: "real", playUrl: normalizePlayUrl(payload) };
    }
  };
}
