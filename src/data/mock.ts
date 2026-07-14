import type { UserProfile, VideoDetail } from "../types";

export const mockUser: UserProfile = {
  id: "10086",
  nickname: "小波用户",
  isSignedIn: true,
  isVip: true,
  hasAccelerate: true,
  inviteCode: "XB2026",
  inviteCount: 6,
  vip: {
    level: 2,
    type: 1,
    typeName: "高速观影特权",
    startTime: 1767225600000,
    endTime: 1798761600000
  }
};

export const mockVideos: VideoDetail[] = [
  {
    id: "demo-1",
    title: "示例影片：Windows 播放验证",
    cover: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80",
    subtitle: "用于验证桌面端播放器链路",
    tags: ["高清", "测试源", "Phase 1"],
    summary: "这是第一期 Windows 客户端的播放验证影片。后续会替换为 Android 接口返回的真实影片、线路和剧集。",
    sources: [
      {
        id: "source-1",
        name: "HTML5 测试线路",
        episodes: [
          {
            id: "ep-1",
            title: "测试播放",
            playUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          }
        ]
      }
    ]
  },
  {
    id: "demo-2",
    title: "会员权益展示样片",
    cover: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=640&q=80",
    subtitle: "展示 VIP/加速状态",
    tags: ["VIP", "加速", "示例"],
    summary: "这个卡片用于展示用户 VIP 状态、加速特权、收藏和历史入口。",
    sources: [
      {
        id: "source-1",
        name: "HTML5 测试线路",
        episodes: [
          {
            id: "ep-1",
            title: "试看",
            playUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          }
        ]
      }
    ]
  }
];
