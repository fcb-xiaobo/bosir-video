import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { mockUser, mockVideos } from "./data/mock";
import type { PageKey, VideoCard, VideoDetail } from "./types";

const navItems: { key: PageKey; label: string }[] = [
  { key: "home", label: "首页" },
  { key: "search", label: "搜索" },
  { key: "history", label: "历史" },
  { key: "favorites", label: "收藏" },
  { key: "profile", label: "我的" },
  { key: "diagnostics", label: "诊断" }
];

const fallbackVideo = mockVideos[0];

function formatVipRange(startTime: number, endTime: number) {
  const start = new Date(startTime).toLocaleDateString();
  const end = new Date(endTime).toLocaleDateString();
  return `${start} - ${end}`;
}

function cardToDetail(video: VideoCard): VideoDetail {
  return {
    ...video,
    summary: video.subtitle || "正在从真实接口加载详情。",
    sources: [
      {
        id: "default",
        name: "真实接口线路",
        episodes: [
          {
            id: video.id,
            title: "播放",
            episodeVodId: video.id
          }
        ]
      }
    ]
  };
}

function firstEpisode(video: VideoDetail) {
  return video.sources[0]?.episodes[0];
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<VideoDetail[]>(mockVideos);
  const [selectedVideo, setSelectedVideo] = useState<VideoDetail>(fallbackVideo);
  const [currentUrl, setCurrentUrl] = useState(firstEpisode(fallbackVideo)?.playUrl ?? "");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(["demo-1"]);
  const [baseUrl, setBaseUrl] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [apiMessage, setApiMessage] = useState("正在读取接口配置...");
  const [dataSource, setDataSource] = useState<"real" | "demo">("demo");
  const [isLoading, setIsLoading] = useState(false);

  const visibleVideos = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword || dataSource === "real") return videos;
    return videos.filter((video) =>
      [video.title, video.subtitle, video.summary, ...video.tags].some((text) => text.toLowerCase().includes(keyword))
    );
  }, [dataSource, query, videos]);

  const loadHome = async () => {
    if (!window.xiaoboApi) {
      setApiMessage("当前不是 Electron 环境，已显示演示数据。");
      return;
    }

    setIsLoading(true);
    const result = await window.xiaoboApi.loadHome();
    setIsLoading(false);

    if (!result.ok) {
      setDataSource("demo");
      setVideos(mockVideos);
      setSelectedVideo(fallbackVideo);
      setCurrentUrl(firstEpisode(fallbackVideo)?.playUrl ?? "");
      setApiMessage(`${result.error.message}。当前显示演示数据。`);
      return;
    }

    const realVideos = result.data.items.map(cardToDetail);
    setDataSource("real");
    setVideos(realVideos);
    setSelectedVideo(realVideos[0] ?? fallbackVideo);
    setCurrentUrl("");
    setApiMessage(`真实接口已连接，首页获取到 ${realVideos.length} 个视频。`);
  };

  useEffect(() => {
    if (!window.xiaoboApi) {
      setApiMessage("当前不是 Electron 环境，已显示演示数据。");
      return;
    }

    void window.xiaoboApi.getStatus().then((result) => {
      if (!result.ok) {
        setApiMessage(result.error.message);
        return;
      }

      setBaseUrl(result.data.baseUrl);
      setBaseUrlInput(result.data.baseUrl);

      if (result.data.hasBaseUrl) {
        void loadHome();
      } else {
        setApiMessage("还没有配置真实接口地址。请到诊断页填写 API 根地址后测试。");
      }
    });
  }, []);

  const runSearch = async () => {
    const keyword = query.trim();
    setActivePage("search");

    if (!keyword || dataSource !== "real" || !window.xiaoboApi) return;

    setIsLoading(true);
    const result = await window.xiaoboApi.searchVideos(keyword);
    setIsLoading(false);

    if (!result.ok) {
      setApiMessage(`搜索失败：${result.error.message}`);
      return;
    }

    const realVideos = result.data.items.map(cardToDetail);
    setVideos(realVideos);
    setSelectedVideo(realVideos[0] ?? selectedVideo);
    setCurrentUrl("");
    setApiMessage(`搜索“${keyword}”返回 ${realVideos.length} 个视频。`);
  };

  const openVideo = async (video: VideoDetail) => {
    setSelectedVideo(video);
    setHistory((items) => Array.from(new Set([video.id, ...items])));
    setActivePage("home");

    if (dataSource !== "real" || !window.xiaoboApi) {
      setCurrentUrl(firstEpisode(video)?.playUrl ?? "");
      return;
    }

    setIsLoading(true);
    const result = await window.xiaoboApi.loadVideoDetail(video);
    setIsLoading(false);

    if (!result.ok) {
      setApiMessage(`详情加载失败：${result.error.message}`);
      setCurrentUrl("");
      return;
    }

    setSelectedVideo(result.data.detail);
    setCurrentUrl(firstEpisode(result.data.detail)?.playUrl ?? "");
  };

  const playEpisode = async (episode = firstEpisode(selectedVideo)) => {
    if (!episode) return;

    if (episode.playUrl) {
      setCurrentUrl(episode.playUrl);
      return;
    }

    if (dataSource !== "real" || !window.xiaoboApi) {
      setApiMessage("当前视频没有可用播放地址。");
      return;
    }

    setIsLoading(true);
    const result = await window.xiaoboApi.loadPlayUrl({
      vodId: selectedVideo.id,
      siteId: episode.siteId ?? selectedVideo.sources[0]?.id,
      episodeVodId: episode.episodeVodId ?? episode.id
    });
    setIsLoading(false);

    if (!result.ok) {
      setApiMessage(`播放地址获取失败：${result.error.message}`);
      return;
    }

    setCurrentUrl(result.data.playUrl);
    setApiMessage("播放地址已从真实接口获取。");
  };

  const saveBaseUrl = async () => {
    if (!window.xiaoboApi) return;
    const result = await window.xiaoboApi.setBaseUrl(baseUrlInput);
    if (!result.ok) {
      setApiMessage(result.error.message);
      return;
    }

    setBaseUrl(result.data.baseUrl);
    setBaseUrlInput(result.data.baseUrl);
    setApiMessage(result.data.hasBaseUrl ? "接口地址已保存，正在加载首页..." : "接口地址已清空。");
    if (result.data.hasBaseUrl) {
      await loadHome();
    }
  };

  const testEndpoint = async () => {
    if (!window.xiaoboApi) return;
    await saveBaseUrl();
    setIsLoading(true);
    const result = await window.xiaoboApi.testEndpoint();
    setIsLoading(false);
    setApiMessage(result.ok ? result.data.message : result.error.message);
  };

  const toggleFavorite = (videoId: string) => {
    setFavorites((items) => (items.includes(videoId) ? items.filter((item) => item !== videoId) : [videoId, ...items]));
  };

  const sourceLabel = dataSource === "real" ? "真实接口" : "演示数据";

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">XB</span>
          <div>
            <strong>小波 Windows</strong>
            <small>{sourceLabel}</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={activePage === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runSearch();
            }}
            placeholder="搜索影片、演员、分类"
          />
          <button className="searchButton" onClick={() => void runSearch()}>
            搜索
          </button>
          <div className="userBadge">
            <span>{mockUser.nickname}</span>
            <strong>{sourceLabel}</strong>
          </div>
        </header>

        <section className="statusLine">
          <span>{isLoading ? "请求中..." : apiMessage}</span>
          {baseUrl && <code>{baseUrl}</code>}
        </section>

        <section className="content">
          {(activePage === "home" || activePage === "search") && (
            <div className="browse">
              <section className="videoGrid">
                {visibleVideos.map((video) => (
                  <button className="videoCard" key={video.id} onClick={() => void openVideo(video)}>
                    <img src={video.cover} alt="" />
                    <span>{video.title}</span>
                    <small>{video.subtitle}</small>
                  </button>
                ))}
              </section>

              <section className="detailPanel">
                <img className="detailCover" src={selectedVideo.cover} alt="" />
                <div className="detailInfo">
                  <div className="tagRow">
                    <span>{sourceLabel}</span>
                    {selectedVideo.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <h1>{selectedVideo.title}</h1>
                  <p>{selectedVideo.summary}</p>
                  <div className="actions">
                    <button onClick={() => void playEpisode()}>播放</button>
                    <button onClick={() => toggleFavorite(selectedVideo.id)}>
                      {favorites.includes(selectedVideo.id) ? "已收藏" : "收藏"}
                    </button>
                  </div>
                  <div className="episodes">
                    {selectedVideo.sources[0]?.episodes.map((episode) => (
                      <button key={episode.id} onClick={() => void playEpisode(episode)}>
                        {episode.title}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activePage === "history" && (
            <Panel title="观影历史" emptyText="暂无观影历史">
              {history.map((id) => {
                const video = [...videos, ...mockVideos].find((item) => item.id === id);
                return video ? (
                  <button onClick={() => void openVideo(video)} key={id}>
                    {video.title}
                  </button>
                ) : null;
              })}
            </Panel>
          )}

          {activePage === "favorites" && (
            <Panel title="我的收藏" emptyText="暂无收藏">
              {favorites.map((id) => {
                const video = [...videos, ...mockVideos].find((item) => item.id === id);
                return video ? (
                  <button onClick={() => void openVideo(video)} key={id}>
                    {video.title}
                  </button>
                ) : null;
              })}
            </Panel>
          )}

          {activePage === "profile" && (
            <Panel title="我的">
              <p>用户 ID：{mockUser.id}</p>
              <p>登录状态：{mockUser.isSignedIn ? "已登录" : "未登录"}</p>
              <p>VIP：{mockUser.isVip ? mockUser.vip.typeName : "普通用户"}</p>
              <p>有效期：{formatVipRange(mockUser.vip.startTime, mockUser.vip.endTime)}</p>
              <p>加速特权：{mockUser.hasAccelerate ? "已开启" : "未开启"}</p>
              <p>邀请码：{mockUser.inviteCode}，已邀请 {mockUser.inviteCount} 人</p>
            </Panel>
          )}

          {activePage === "diagnostics" && (
            <Panel title="接口诊断">
              <label className="settingsField">
                <span>API 根地址</span>
                <input
                  value={baseUrlInput}
                  onChange={(event) => setBaseUrlInput(event.target.value)}
                  placeholder="https://你的真实接口域名"
                />
              </label>
              <div className="actions">
                <button onClick={() => void saveBaseUrl()}>保存并加载首页</button>
                <button onClick={() => void testEndpoint()}>测试接口</button>
              </div>
              <p>已接入接口路径：首页 v6/vod/home.capi，搜索 vod/search/query，详情 v2/vod/detail.capi，播放 vod/episodePlayUrl。</p>
              <p>如果未填写 API 根地址，客户端会显示带明确标识的演示数据，不会冒充真实内容。</p>
            </Panel>
          )}
        </section>
      </section>

      <aside className="player">
        <div className="playerHeader">
          <span>正在播放</span>
          <strong>{selectedVideo.title}</strong>
        </div>
        {currentUrl ? <video src={currentUrl} controls autoPlay /> : <div className="emptyPlayer">点击播放后获取真实播放地址</div>}
        <div className="sourceInfo">
          <span>线路：{selectedVideo.sources[0]?.name ?? "未选择"}</span>
          <span>{sourceLabel}</span>
        </div>
      </aside>
    </main>
  );
}

function Panel({ title, emptyText, children }: { title: string; emptyText?: string; children?: ReactNode }) {
  return (
    <section className="panel">
      <h1>{title}</h1>
      <div className="panelBody">{children || <p>{emptyText}</p>}</div>
    </section>
  );
}
