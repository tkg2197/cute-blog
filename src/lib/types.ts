export type AuthorKey = "white" | "brown";

export interface Profile {
  id: string;
  email: string;
  author_key: AuthorKey;
  display_name: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_markdown: string;
  storage_path: string | null;
  author_id: string;
  tags: string[] | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "author_key"> | null;
}

export interface Photo {
  id: string;
  owner_id: string;
  title: string | null;
  caption: string | null;
  taken_on: string | null;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "author_key"> | null;
  publicUrl?: string;
}

export interface LifeRecord {
  id: string;
  owner_id: string;
  record_on: string;
  mood: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "author_key"> | null;
}

export type PlaceTone = "night" | "desert" | "forest" | "sea";

export interface Place {
  id: string;
  owner_id: string;
  name: string;
  note: string;
  tone: PlaceTone;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "author_key"> | null;
}

export const PLACE_TONE_LABELS: Record<PlaceTone, string> = {
  night: "星夜",
  desert: "日落",
  forest: "山林",
  sea: "海边",
};

export interface ActivityEntry {
  id: string;
  owner_id: string;
  activity_on: string;
  period: string;
  category: string;
  minutes: number;
  body: string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name" | "author_key"> | null;
}

export const AUTHOR_LABELS: Record<AuthorKey, string> = {
  white: "白狗",
  brown: "棕狗",
};

export const AUTHOR_COLORS: Record<AuthorKey, string> = {
  white: "#7aa6d4",
  brown: "#d49356",
};

export const MOOD_LABELS: Record<string, string> = {
  happy: "开心",
  loved: "幸福",
  calm: "平静",
  tired: "疲惫",
  down: "难过",
  moody: "烦躁",
};

export const ACTIVITY_PERIODS = [
  { key: "morning", label: "早晨", time: "05:00-08:00", minutes: 180 },
  { key: "forenoon", label: "上午", time: "08:00-11:00", minutes: 180 },
  { key: "noon", label: "中午", time: "11:00-14:00", minutes: 180 },
  { key: "afternoon", label: "下午", time: "14:00-17:00", minutes: 180 },
  { key: "dusk", label: "傍晚", time: "17:00-19:00", minutes: 120 },
  { key: "evening", label: "晚上", time: "19:00-23:00", minutes: 240 },
  { key: "midnight", label: "半夜", time: "23:00-05:00", minutes: 360 },
] as const;

export const ACTIVITY_CATEGORIES = ["学习", "工作", "约会", "家务", "娱乐", "休息", "运动", "其他"] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  学习: "#7aa6d4",
  工作: "#91c6b6",
  约会: "#e6a6bd",
  家务: "#d49356",
  娱乐: "#a7c978",
  休息: "#b9aedb",
  运动: "#efb36f",
  其他: "#9aa7b7",
};
