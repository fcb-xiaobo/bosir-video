export type VipInfo = {
  level: number;
  type: number;
  typeName: string;
  startTime: number;
  endTime: number;
};

export type UserProfile = {
  id: string;
  nickname: string;
  isSignedIn: boolean;
  isVip: boolean;
  hasAccelerate: boolean;
  inviteCode: string;
  inviteCount: number;
  vip: VipInfo;
};

export type VideoCard = {
  id: string;
  title: string;
  cover: string;
  subtitle: string;
  tags: string[];
};

export type Episode = {
  id: string;
  title: string;
  playUrl: string;
};

export type VideoDetail = VideoCard & {
  summary: string;
  sources: {
    id: string;
    name: string;
    episodes: Episode[];
  }[];
};

export type PageKey = "home" | "search" | "history" | "favorites" | "profile" | "diagnostics";
