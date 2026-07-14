import { describe, expect, test, vi } from "vitest";
import {
  buildApiUrl,
  createVideoApiGateway,
  normalizePlayUrl,
  normalizeVideoDetail,
  normalizeVodItems
} from "./videoApiGateway";

describe("video API gateway", () => {
  test("builds Android API URLs from a configurable base URL", () => {
    const url = buildApiUrl("https://api.example.com/root/", "v2/vod/detail.capi", {
      vodId: "abc 123",
      siteId: 7
    });

    expect(url).toBe("https://api.example.com/root/v2/vod/detail.capi?vodId=abc+123&siteId=7");
  });

  test("extracts video cards from nested Android-style list payloads", () => {
    const videos = normalizeVodItems({
      code: 0,
      data: {
        blocks: [
          {
            title: "热播",
            vods: [
              {
                id: 101,
                title: "第一部真实影片",
                image: "https://cdn.example.com/cover-a.jpg",
                area: "大陆",
                year: "2026",
                scoreText: "8.8"
              }
            ]
          }
        ],
        list: [
          {
            vodId: "202",
            vodName: "第二部真实影片",
            imagePath: "/cover-b.jpg",
            categoryName: "电影",
            bottomLabel: "更新至 8 集"
          }
        ]
      }
    });

    expect(videos).toEqual([
      {
        id: "101",
        title: "第一部真实影片",
        cover: "https://cdn.example.com/cover-a.jpg",
        subtitle: "大陆 · 2026 · 8.8",
        tags: ["大陆", "2026", "8.8"]
      },
      {
        id: "202",
        title: "第二部真实影片",
        cover: "/cover-b.jpg",
        subtitle: "电影 · 更新至 8 集",
        tags: ["电影", "更新至 8 集"]
      }
    ]);
  });

  test("extracts playable URLs from common episode play responses", () => {
    expect(normalizePlayUrl({ data: { playUrl: "https://cdn.example.com/video.m3u8" } })).toBe(
      "https://cdn.example.com/video.m3u8"
    );
    expect(normalizePlayUrl({ url: "https://cdn.example.com/video.mp4" })).toBe("https://cdn.example.com/video.mp4");
  });

  test("extracts episode metadata from detail responses even when episodes have no covers", () => {
    const detail = normalizeVideoDetail({
      data: {
        id: "v100",
        title: "连续剧",
        image: "https://cdn.example.com/show.jpg",
        summary: "真实详情",
        playSources: [
          {
            siteId: "line-a",
            name: "高清线路",
            episodes: [
              {
                episodeVodId: "ep-1",
                title: "第 1 集"
              }
            ]
          }
        ]
      }
    });

    expect(detail.sources[0]).toEqual({
      id: "line-a",
      name: "高清线路",
      episodes: [
        {
          id: "ep-1",
          title: "第 1 集",
          episodeVodId: "ep-1",
          siteId: "line-a"
        }
      ]
    });
  });

  test("loads home content with required Android-compatible headers", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            list: [{ id: "v1", title: "接口影片", image: "https://cdn.example.com/v1.jpg" }]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const gateway = createVideoApiGateway({
      getBaseUrl: () => "https://api.example.com",
      fetchImpl
    });

    const result = await gateway.loadHome();

    expect(result.items[0].title).toBe("接口影片");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/v6/vod/home.capi",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "okhttp/4.12.0",
          "X-CDN": "1"
        })
      })
    );
  });

  test("searches videos through the Android search endpoint", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ data: { list: [{ id: "s1", title: "搜索结果", image: "cover.jpg" }] } }), {
        status: 200
      });
    });
    const gateway = createVideoApiGateway({
      getBaseUrl: () => "https://api.example.com",
      fetchImpl
    });

    const result = await gateway.searchVideos("动作");

    expect(result.items[0].title).toBe("搜索结果");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/vod/search/query?keyword=%E5%8A%A8%E4%BD%9C",
      expect.any(Object)
    );
  });

  test("loads playable episode URLs through the Android play endpoint", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ data: { playUrl: "https://cdn.example.com/ep-1.m3u8" } }), { status: 200 });
    });
    const gateway = createVideoApiGateway({
      getBaseUrl: () => "https://api.example.com",
      fetchImpl
    });

    const result = await gateway.loadPlayUrl({ vodId: "v1", siteId: "line-a", episodeVodId: "ep-1" });

    expect(result.playUrl).toBe("https://cdn.example.com/ep-1.m3u8");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/vod/episodePlayUrl?vodId=v1&siteId=line-a&episodeVodId=ep-1",
      expect.any(Object)
    );
  });
});
