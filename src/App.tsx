import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { mockUser, mockVideos } from "./data/mock";
import type { PageKey, VideoDetail } from "./types";

const navItems: { key: PageKey; label: string }[] = [
  { key: "home", label: "首页" },
  { key: "search", label: "搜索" },
  { key: "history", label: "历史" },
  { key: "favorites", label: "收藏" },
  { key: "profile", label: "我的" },
  { key: "diagnostics", label: "诊断" }
];

function formatVipRange(startTime: number, endTime: number) {
  const start = new Date(startTime).toLocaleDateString();
  const end = new Date(endTime).toLocaleDateString();
  return `${start} - ${end}`;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [query, setQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<VideoDetail>(mockVideos[0]);
  const [currentUrl, setCurrentUrl] = useState(mockVideos[0].sources[0].episodes[0].playUrl);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(["demo-1"]);

  const visibleVideos = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return mockVideos;
    return mockVideos.filter((video) =>
      [video.title, video.subtitle, video.summary, ...video.tags].some((text) => text.toLowerCase().includes(keyword))
    );
  }, [query]);

  const openVideo = (video: VideoDetail) => {
    setSelectedVideo(video);
    setCurrentUrl(video.sources[0].episodes[0].playUrl);
    setHistory((items) => Array.from(new Set([video.id, ...items])));
    setActivePage("home");
  };

  const toggleFavorite = (videoId: string) => {
    setFavorites((items) => (items.includes(videoId) ? items.filter((item) => item !== videoId) : [videoId, ...items]));
  };

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">XB</span>
          <div>
            <strong>小波 Windows</strong>
            <small>Phase 1</small>
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
            onChange={(event) => {
              setQuery(event.target.value);
              setActivePage("search");
            }}
            placeholder="搜索影片、演员、分类"
          />
          <div className="userBadge">
            <span>{mockUser.nickname}</span>
            <strong>{mockUser.vip.typeName}</strong>
          </div>
        </header>

        <section className="content">
          {(activePage === "home" || activePage === "search") && (
            <div className="browse">
              <section className="videoGrid">
                {visibleVideos.map((video) => (
                  <button className="videoCard" key={video.id} onClick={() => openVideo(video)}>
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
                    {selectedVideo.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <h1>{selectedVideo.title}</h1>
                  <p>{selectedVideo.summary}</p>
                  <div className="actions">
                    <button onClick={() => setCurrentUrl(selectedVideo.sources[0].episodes[0].playUrl)}>播放</button>
                    <button onClick={() => toggleFavorite(selectedVideo.id)}>
                      {favorites.includes(selectedVideo.id) ? "已收藏" : "收藏"}
                    </button>
                  </div>
                  <div className="episodes">
                    {selectedVideo.sources[0].episodes.map((episode) => (
                      <button key={episode.id} onClick={() => setCurrentUrl(episode.playUrl)}>
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
                const video = mockVideos.find((item) => item.id === id);
                return video ? <button onClick={() => openVideo(video)} key={id}>{video.title}</button> : null;
              })}
            </Panel>
          )}

          {activePage === "favorites" && (
            <Panel title="我的收藏" emptyText="暂无收藏">
              {favorites.map((id) => {
                const video = mockVideos.find((item) => item.id === id);
                return video ? <button onClick={() => openVideo(video)} key={id}>{video.title}</button> : null;
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
              <p>当前阶段：本地 mock 数据 + HTML5 播放链路验证</p>
              <p>Android 参考 APK：F:\\study_apk\\nativefix-final.apk</p>
              <p>下一步：接入 appInit、user/info、视频列表、详情和播放地址接口。</p>
            </Panel>
          )}
        </section>
      </section>

      <aside className="player">
        <div className="playerHeader">
          <span>正在播放</span>
          <strong>{selectedVideo.title}</strong>
        </div>
        <video src={currentUrl} controls autoPlay />
        <div className="sourceInfo">
          <span>线路：{selectedVideo.sources[0].name}</span>
          <span>HTML5 播放器</span>
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
