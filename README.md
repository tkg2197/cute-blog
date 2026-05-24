# 我们的小窝 Astro 后端版

这个目录是新的 Astro + Supabase 实现，根目录下的静态原型继续保留作视觉和交互参考。

## 本地启动

```bash
pnpm install
pnpm dev
```

默认访问：

```text
http://localhost:4321
```

## 环境变量

复制 `.env.example` 为 `.env`，并填写 Supabase 项目密钥：

```text
SUPABASE_URL=https://scjihneptjnjkcrathsx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` 只在 Astro 服务端读取，不要放进任何 `PUBLIC_` 环境变量或浏览器脚本里。

可选：

```text
ALLOWED_SIGNUP_EMAILS=white@example.com,brown@example.com
```

设置后，只有列表里的两个邮箱可以注册。

## Supabase 初始化

在 Supabase SQL Editor 运行：

```text
supabase/migrations/001_initial_schema.sql
```

迁移会创建：

- `profiles`：两位作者资料，白狗/棕狗各唯一。
- `blog_posts`：Markdown 文章元数据和正文。
- `photos`：照片元数据。
- Storage bucket：`photos`、`blog-markdown`。
- RLS policy：公开读取文章/照片，登录用户只能写自己的内容。

## 当前功能

- 邮箱 + 密码注册和登录。
- `/admin` 后台上传照片到 Supabase Storage。
- `/admin` 后台上传 Markdown 文件，并保存原始文件到 `blog-markdown` bucket。
- `/blog` 和 `/blog/[slug]` 展示文章。
- `/photos` 展示照片墙。
