export interface ParsedMarkdown {
  title: string;
  excerpt: string;
  tags: string[];
  body: string;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(input: string) {
  return escapeHtml(input)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function parseFrontmatter(source: string) {
  if (!source.startsWith("---")) return { attrs: new Map<string, string>(), body: source };
  const end = source.indexOf("\n---", 3);
  if (end === -1) return { attrs: new Map<string, string>(), body: source };
  const raw = source.slice(3, end).trim();
  const body = source.slice(end + 4).trim();
  const attrs = new Map<string, string>();
  raw.split(/\r?\n/).forEach((line) => {
    const hit = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (hit) attrs.set(hit[1].toLowerCase(), hit[2].replace(/^["']|["']$/g, "").trim());
  });
  return { attrs, body };
}

export function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `post-${Date.now()}`;
}

export function parseMarkdown(source: string, fallbackTitle: string): ParsedMarkdown {
  const { attrs, body } = parseFrontmatter(source);
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = attrs.get("title") || heading || fallbackTitle;
  const excerpt =
    attrs.get("excerpt") ||
    body
      .replace(/^#\s+.+$/m, "")
      .split(/\r?\n\r?\n/)
      .map((part) => part.trim())
      .find(Boolean) ||
    "";
  const tags = (attrs.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return { title, excerpt, tags, body };
}

export function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let inCode = false;
  let code: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      code.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      return;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      return;
    }

    paragraph.push(line.trim());
  });

  flushParagraph();
  flushList();
  if (code.length) html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return html.join("\n");
}

export interface ArticleSection {
  id: string;
  title: string;
  html: string;
}

// 切分 markdown，按 ## 二级标题切成多个 article-section 块，供原型 TOC 使用。
export function renderArticleSections(source: string): ArticleSection[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const sections: ArticleSection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  let counter = 0;

  function pushSection(title: string, body: string[]) {
    counter += 1;
    const id = slugify(title) || `section-${counter}`;
    sections.push({
      id,
      title: title || "正文",
      html: renderMarkdown(body.join("\n")),
    });
  }

  lines.forEach((line) => {
    // 跳过 # 一级标题，已经在 head 里展示
    if (/^#\s+/.test(line)) return;
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (currentTitle || currentLines.length) {
        pushSection(currentTitle, currentLines);
      }
      currentTitle = h2[1].trim();
      currentLines = [];
      return;
    }
    currentLines.push(line);
  });

  if (currentTitle || currentLines.length) {
    pushSection(currentTitle, currentLines);
  }

  return sections;
}
