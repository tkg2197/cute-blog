# 「我们的小窝」项目交接文档

最后更新：2026-05-24
项目仓库：https://github.com/tkg2197/cute-blog
线上地址：暂用 Vercel 临时域名 `cute-blog-*.vercel.app`，正在购买阿里云自定义域名

---

## 1. 项目概况

「我们的小窝」是一个双人情侣向的可爱插画风个人网站。两位作者由两只小狗代表：

- 🐶 **白狗**：作者 A，主色 `#7aa6d4`（柔和蓝）
- 🐕 **棕狗**：作者 B，主色 `#d49356`（暖橙）

定位关键词：**柔和、可爱、有空气感**，不要变成普通技术博客或后台管理系统。

### 功能模块

| 模块 | 路由 | 说明 |
|---|---|---|
| 首页 | `/` | Welcome 封面 → 进入小窝主页（双人状态、最近照片、入口卡片、想去的地方、最近文章） |
| 双人博客 | `/blog`, `/blog/[slug]` | Markdown 文章列表 + 详情，作者/标签筛选，TOC 高亮 |
| 生活记录 | `/records` | 便签式时间线，按天分组，含照片与心情 |
| 照片墙 | `/photos` | 按日期分组的照片摞 → 详情网格 → 3D 切片翻转灯箱 |
| 时段活动 | `/activity` | 7 个时段时间线 + 分类占比环形图 + 时段概览 |
| 今年想去 | `/places` | 想去的地方卡片墙（带氛围 tone） |
| 后台 | `/admin` | 上传照片 / 上传 Markdown / 管理已上传内容 |
| 登录注册 | `/auth/login`, `/auth/register` | 4 个动画角色互动登录页 + 注册页 |

---

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | **Astro 6.3.7** (SSR mode, `output: "server"`) |
| 部署 adapter | **@astrojs/vercel** (sin1 新加坡区域) |
| 后端 / 数据库 | **Supabase**（auth + Postgres + Storage） |
| 包管理 | **npm**（不再用 pnpm，`package-lock.json` 锁版本） |
| 部署平台 | **Vercel Hobby 免费版**（GitHub 自动部署） |
| 语言 | TypeScript（lib/、middleware）+ Astro 模板 |
| 字体 | Satoshi Variable（放在 `public/fonts/`） |

### 部署架构

```
浏览器
  ↓ HTTPS
Vercel Edge (sin1, 新加坡)
  ↓ Astro SSR
Supabase (新加坡)
  ├─ Auth（邮箱密码）
  ├─ Postgres（profiles / blog_posts / photos / life_records / activity_entries / places）
  └─ Storage（photos bucket + blog-markdown bucket）
```

Vercel 函数区域固定在 `sin1` 是为了和 Supabase 共址，往返延迟从 ~200ms 降到 ~10ms。配置在 [`vercel.json`](./vercel.json)。

---

## 3. 目录结构

```
cute-blog/                       ← GitHub 仓库根
├── astro.config.mjs             ← Astro + Vercel adapter 配置
├── vercel.json                  ← Vercel region 锁定 sin1
├── package.json                 ← npm 依赖（@astrojs/vercel + supabase-js + astro）
├── package-lock.json
├── tsconfig.json
├── .env.example                 ← 环境变量模板
├── .env                         ← 真实密钥（gitignored，绝不入仓）
├── .gitignore                   ← 已配置好，挡住 .env / node_modules / dist / .vercel
├── README.md
├── 更新流程.md                  ← 日常开发/部署流程指南
├── HANDOFF.md                   ← 本文档
│
├── public/                      ← 静态资源（直接走 CDN，不经过 SSR）
│   ├── assets/                  ← 草地图、首页头像、首页封面 (.png/.jpg)
│   ├── fonts/                   ← Satoshi-Variable.ttf, Satoshi-VariableItalic.ttf
│   ├── gif/                     ← 14 个小狗 GIF / PNG (待机 + 动作)
│   ├── scripts/                 ← 共享前端 JS (corner-dogs / scroll-reveal / page-transition / ghost / cover / home / 各页专属 JS)
│   └── styles/                  ← 共享 CSS (styles / app / 各页专属 CSS)
│
├── src/
│   ├── env.d.ts
│   ├── middleware.ts            ← 每个请求拦截：读 session → 注入 user/profile → 拦截受保护路由
│   │
│   ├── lib/
│   │   ├── env.ts               ← 读 SUPABASE_URL / KEY / SERVICE_ROLE_KEY
│   │   ├── supabase.ts          ← 三种客户端：anon / service / userClient(accessToken)
│   │   ├── auth.ts              ← session cookie 读写 + 自动 refresh
│   │   ├── files.ts             ← 上传文件后缀名解析
│   │   ├── storage.ts           ← 确保 Supabase Storage buckets 存在
│   │   ├── markdown.ts          ← 自研 Markdown 解析器 + 按 ## 切 article-section
│   │   └── types.ts             ← 全部数据模型 + 常量（AUTHOR_LABELS 等）
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro     ← 给 admin / auth 用的"管理系统"风格布局
│   │   └── PrototypeLayout.astro← 给主要内容页用的"原型风格"布局（云朵背景、玻璃 nav、共享 JS）
│   │
│   └── pages/
│       ├── index.astro          ← 首页（Welcome 封面 + 小窝主页）
│       │
│       ├── blog/
│       │   ├── index.astro      ← 博客列表 + 上传 Markdown 抽屉式表单
│       │   └── [slug].astro     ← 文章详情 + TOC + 阅读进度条
│       │
│       ├── records.astro        ← 生活记录便签时间线 + 灯箱
│       ├── photos.astro         ← 照片墙 + 详情 + 3D slicebox 灯箱
│       ├── activity.astro       ← 时段活动 + 环形图 + 时段概览
│       ├── places.astro         ← 今年想去地点卡片
│       │
│       ├── admin/
│       │   └── index.astro      ← 后台：上传 / 管理
│       │
│       ├── auth/
│       │   ├── login.astro      ← 动画角色登录页（4 个色块跟随鼠标）
│       │   └── register.astro
│       │
│       └── api/                 ← Astro endpoints（form action 都打这里）
│           ├── auth/
│           │   ├── login.ts
│           │   ├── logout.ts
│           │   └── register.ts
│           ├── blog/
│           │   ├── upload.ts    ← 接收 .md 文件，解析 frontmatter，上传到 storage
│           │   └── delete.ts
│           ├── photos/
│           │   ├── upload.ts
│           │   └── delete.ts
│           ├── records/
│           │   ├── create.ts
│           │   └── delete.ts
│           ├── activity/
│           │   ├── create.ts
│           │   └── delete.ts
│           └── places/
│               ├── create.ts
│               └── delete.ts
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql      ← profiles, blog_posts, photos, storage buckets, RLS
        ├── 002_life_records.sql        ← life_records 表 + RLS
        ├── 003_activity_entries.sql    ← activity_entries 表 + RLS
        └── 004_places.sql              ← places 表 + RLS
```

---

## 4. 数据模型

所有表都启用了 RLS。公开读、本人写。

### `profiles`（用户资料）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | uuid (auth.users.id) | 主键，关联 auth |
| `email` | text | 邮箱 |
| `author_key` | `'white'` \| `'brown'` | 决定颜色和身份 |
| `display_name` | text | 显示名（默认 "白狗" / "棕狗"） |
| `created_at` | timestamptz | |

用户首次访问时由 [middleware.ts](./src/middleware.ts) 用 service client 自动 upsert 一行。

### `blog_posts`

| 列 | 说明 |
|---|---|
| `id`, `slug`(unique), `title`, `excerpt`, `content_markdown`, `storage_path` | |
| `author_id` → `profiles.id` | |
| `tags` (text[]) | |
| `published_at`, `created_at`, `updated_at` | |

文章原始 `.md` 文件保存到 `blog-markdown` storage bucket，正文同时存进 `content_markdown` 字段（方便不读 storage 直接渲染）。

### `photos`

| 列 | 说明 |
|---|---|
| `id`, `owner_id` → profiles | |
| `title`, `caption`, `taken_on` (date) | |
| `storage_path` | photos bucket 里的路径 |
| `mime_type` | |
| `created_at` | |

`taken_on` 用于按"拍摄日期"分组（照片墙、生活记录联动）。

### `life_records`

| 列 | 说明 |
|---|---|
| `id`, `owner_id`, `record_on` (date), `mood`, `body` | mood 是枚举：happy/loved/calm/tired/down/moody |
| `created_at`, `updated_at` | |

通过 `(owner_id, record_on)` 与 photos 关联——同一作者同一天的照片会出现在记录里。

### `activity_entries`

| 列 | 说明 |
|---|---|
| `id`, `owner_id`, `activity_on` (date) | |
| `period` | 枚举 7 个：morning/forenoon/noon/afternoon/dusk/evening/midnight |
| `category` | 枚举 8 个：学习/工作/约会/家务/娱乐/休息/运动/其他 |
| `minutes` (1-720), `body` | |

### `places`

| 列 | 说明 |
|---|---|
| `id`, `owner_id`, `name` (1-32), `note` (1-140) | |
| `tone` | 枚举 4 个：night/desert/forest/sea —— 决定卡片视觉氛围 |

### Storage Buckets

| Bucket | 公开 | 用途 |
|---|---|---|
| `photos` | 是 | 所有照片，公开 URL 直接给浏览器 |
| `blog-markdown` | 否 | 备份原始 .md 文件，仅 service client 可读 |

---

## 5. 三种 Supabase 客户端

[`src/lib/supabase.ts`](./src/lib/supabase.ts) 导出三个：

| 客户端 | 用途 | 权限 |
|---|---|---|
| `createAnonClient()` | 登录注册等无 session 操作 | RLS 公开层 |
| `createServiceClient()` | 服务端要绕 RLS（比如 middleware 帮新用户建 profile） | 全权限，**绝不能给浏览器** |
| `createUserClient(accessToken)` | 拿当前用户 token 调用，RLS 自动按用户身份判断 | 用户身份 |

页面 SSR 通常用 service client 读取数据（因为表都设了"公开读"，service client 读不会出问题，且不用每次 refresh token）。

---

## 6. 认证流程

### 登录

`/auth/login` → POST `/api/auth/login`：

1. 后端 `signInWithPassword` 拿到 session
2. `setSessionCookies()` 把 access_token + refresh_token 写到 cookie（httpOnly, samesite=lax）
3. 重定向到 `?redirect=` 参数指定的地址，默认 `/?skipCover=1#home`

### 每个请求

[`src/middleware.ts`](./src/middleware.ts) 拦截：

1. `readSession(cookies)` 看 cookie 里有没有 token
2. 有 → `getUser(accessToken)` 验证；过期 → `refreshSession(refreshToken)` 续期
3. 用 service client 读取或自动创建 `profiles` 行
4. 把 `user` 和 `profile` 注入 `Astro.locals`
5. 受保护路由（`/admin`、`/api/blog/*`、`/api/photos/*`、`/api/records/*`、`/api/activity/*`、`/api/places/*`）未登录会重定向到 `/auth/login?redirect=...`
6. 已登录访问 `/auth/login` 直接跳首页

### 退出

POST `/api/auth/logout` → `clearSessionCookies()` → 重定向

---

## 7. 布局系统

### `PrototypeLayout.astro`（主要内容页用）

- 复刻原型的可爱风：云朵背景 + 玻璃 nav + 角落小狗 + ghost 装饰
- 自动加载共享 CSS：`corner-dogs / site-font / scroll-reveal / page-transition / ghost`
- 自动加载共享 JS：同上对应的 4 个 JS
- 导航栏右侧整合了登录 / 用户名胶囊 + 退出按钮
- 支持 `backHref` 自动渲染左上角"← 返回"按钮（home 页不渲染）

Props：
```ts
{
  title: string;
  description?: string;
  current?: "home" | "places" | "blog" | "records" | "photos" | "activity";
  bgClass?: string;        // 比如 "bi-bg" / "rec-bg" / "pw-bg" / "act-bg" / "pl-bg" / "blog-bg"
  bodyClass?: string;
  htmlClass?: string;
  hideNav?: boolean;       // 首页用 true（首页自己渲染 home-nav）
  backHref?: string;       // 左上返回按钮目标
  backLabel?: string;      // 默认 "返回"
}
```

### `BaseLayout.astro`（admin / auth 用）

- 简洁的纯色 nav，没有云朵和小狗
- 用 `app.css`（自带表单、面板的样式）
- 也支持 `backHref` 同样形式

---

## 8. 共享前端组件（在 `public/scripts/` + `public/styles/`）

| 文件 | 作用 |
|---|---|
| `corner-dogs.js/css` | 页面右下角白狗 + 棕狗，待机 / 点击播放动作 / 随机说话 / 看 hover 区域 |
| `scroll-reveal.js/css` | 滚到视口才淡入元素 |
| `page-transition.js/css` | 站内跳转拦截，离场动画 (220ms) + 入场动画，沿途算 sticky nav 收缩成胶囊的 progress |
| `ghost.js/css` | 浮动小鬼魂装饰，绕开文字 |
| `blog-index.js` | 博客列表的作者/标签筛选、上传 Markdown 表单 |
| `blog.js` | 文章页 TOC 高亮 + 阅读进度条 + 顶部标签收拢 |
| `cover.js` | 首页 Welcome 封面：花瓣鼠标排斥、Explore 按钮 |
| `home.js` | 首页时段背景切换、白狗/棕狗状态编辑（localStorage） |

---

## 9. 几个关键的设计决定

### 9.1 为什么 photos.astro 内嵌大量 JS？

`/photos` 的灯箱有一个**3D 切片翻转效果**（slicebox），需要：
- 预加载下一张图
- 把当前图切成 N 条用 `transform: rotateY/X` 翻转
- 隔次做整体翻转
- 控制透视、明暗

这套逻辑用 Astro 客户端 `is:inline` 写在页面里最方便（共享数据通过 `<script type="application/json">` 注入）。如果以后要拆出来可以做成独立 module。

### 9.2 为什么登录页是独立 HTML 不用 layout？

`/auth/login` 走 1:1 复刻 [animatedlogin-main](https://github.com/guohaolian/animated-characters-login-page) 的设计，需要：
- `body { overflow: hidden; height: 100vh; }`
- CSS Grid 两栏全屏
- 自己引 Inter 字体
- 不要 nav、不要小狗、不要 ghost

跟其它页面格格不入，所以直接写完整 HTML 不套 layout。`← 返回` 按钮是页面内部独立放的。

### 9.3 为什么 markdown 解析自己写？

[`src/lib/markdown.ts`](./src/lib/markdown.ts) 只实现了项目用得到的子集：
- frontmatter（title / excerpt / tags）
- # / ## / ### 标题
- 段落 / 列表 / 引用 / 代码块
- 粗体 / 斜体 / 行内代码 / 链接

没用 `marked` / `markdown-it` 是为了：
- 不加额外依赖
- 控制 `renderArticleSections()` 按 `##` 切成 `<section>` 块（给 blog.js 的 TOC 用）
- 输出干净的 HTML，避免被第三方库引入 XSS 风险

未来要加表格 / 任务列表 / 图片占位再考虑切到 `marked`。

### 9.4 为什么 Astro 的页面里有那么多内联 `<style is:global>`？

PrototypeLayout 注入了一坨"非原型"专属样式（auth 胶囊、site-back-btn 等），这些不属于任何一个原型 CSS 文件，又不想新建一个 CSS 文件单独维护——直接在 layout 里 global 注入最实用。Astro 默认 scoped CSS，需要 `is:global` 才能让选择器作用到全站。

---

## 10. 已知约束 / 后续可优化

### 10.1 性能

- 图片不压缩，原图直接服务。可以考虑：
  - Supabase Pro 的 transform 参数（$25/月）
  - 或上传时 sharp 生成缩略图存第二个 path
- 上传走 Vercel 中转。大文件可以改成浏览器直传 Supabase Storage（用 signed upload URL）

### 10.2 体验

- "忘记密码？"链接没接通（页面上是 `href="#"`）
- 邮箱注册没接邮箱验证流程（取决于 Supabase 项目是否开启 Confirm Email）
- 手机端横屏没专门优化
- 没有 RSS / sitemap

### 10.3 内容

- 没有评论系统（如果要加：可以接 [giscus](https://giscus.app) 或自建一张 comments 表）
- 没有搜索（量小到一定阶段再考虑）
- 没有按年/月归档（博客列表里有 "按年份浏览" 但当前只列 2026）

### 10.4 数据安全

- 没有定期备份。Supabase 免费版有自动备份保留 7 天
- 没有 dev / prod 环境隔离。本地开发用的就是生产库（详见 [`更新流程.md`](./更新流程.md) 的"坑"章节）

---

## 11. 怎么改东西

详细的开发与部署流程见 [`更新流程.md`](./更新流程.md)。最简短的说法：

```bash
# 1. 本地
cd astro
npm install        # 第一次或换设备
npm run dev        # http://localhost:4321

# 2. 推上线
git add .
git commit -m "改了什么"
git push           # Vercel 自动部署
```

---

## 12. 给下一个接手的人

如果你是接手的同事 / 朋友 / AI：

1. **必读三个文件**：
   - 本文件（项目结构）
   - [`更新流程.md`](./更新流程.md)（怎么开发部署）
   - [`README.md`](./README.md)（项目快速启动）

2. **从这几个文件开始读源码**：
   - [`src/middleware.ts`](./src/middleware.ts)（每个请求都过这里）
   - [`src/layouts/PrototypeLayout.astro`](./src/layouts/PrototypeLayout.astro)（大部分页面套这个壳）
   - [`src/lib/types.ts`](./src/lib/types.ts)（所有数据模型）
   - [`src/lib/supabase.ts`](./src/lib/supabase.ts)（三种客户端）

3. **要改某个页面**，对应文件：

| 页面 | 文件 |
|---|---|
| 首页 | `src/pages/index.astro` |
| 博客列表 | `src/pages/blog/index.astro` + `public/styles/blog-index.css` + `public/scripts/blog-index.js` |
| 博客详情 | `src/pages/blog/[slug].astro` + `public/styles/blog.css` + `public/scripts/blog.js` |
| 生活记录 | `src/pages/records.astro` + `public/styles/records.css` |
| 照片墙 | `src/pages/photos.astro` + `public/styles/photos.css` |
| 时段活动 | `src/pages/activity.astro` + `public/styles/activity.css` |
| 今年想去 | `src/pages/places.astro` + `public/styles/places.css` |
| 后台 | `src/pages/admin/index.astro`（用 BaseLayout + app.css） |
| 登录 | `src/pages/auth/login.astro`（独立 HTML，4 个动画角色） |

4. **改数据库结构**：
   - 在 `supabase/migrations/` 新加文件 `00X_xxx.sql`
   - 去 Supabase Dashboard SQL Editor 跑一次
   - 在 `src/lib/types.ts` 加对应 TS 类型
   - 在 `src/pages/api/...` 加对应的 endpoint

5. **改样式风格的总指南**：保持柔和、可爱、有空气感，**不要变成普通技术博客或后台管理系统**。

6. **改完先本地 build 检查不报错再推**：
   ```bash
   npm run build
   ```

7. **保持中文沟通和注释**。代码里中文注释能解释清楚的就用中文。

8. **不要把 `.env` 加进 git**。`.gitignore` 已经挡住，正常不会出错。

祝接手顺利 🐶🐕
