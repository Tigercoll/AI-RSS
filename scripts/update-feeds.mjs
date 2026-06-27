import fs from 'node:fs/promises';

const USER_AGENT = 'Mozilla/5.0 AI-RSS/2.0';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const SHANGHAI_TZ = 'Asia/Shanghai';

const feeds = [
  { name: 'OpenAI', class: 'openai', type: 'rss', url: 'https://openai.com/news/rss.xml' },
  { name: 'Anthropic News', class: 'anthropic', type: 'html', url: 'https://www.anthropic.com/news', linkPattern: /href="(\/news\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi, preferListText: true },
  { name: 'Anthropic Engineering', class: 'anthropic', type: 'html', url: 'https://www.anthropic.com/engineering', linkPattern: /href="(\/engineering\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi, preferListText: true },
  { name: 'Google DeepMind', class: 'google', type: 'rss', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Meta AI Research', class: 'meta', type: 'rss', url: 'https://ai.meta.com/blog/rss/' },
  { name: 'AWS ML Blog', class: 'aws', type: 'rss', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
  { name: 'NVIDIA Developer Blog', class: 'nvidia', type: 'rss', url: 'https://developer.nvidia.com/blog/feed' },
  { name: 'Hugging Face Blog', class: 'huggingface', type: 'rss', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'vLLM Blog', class: 'vllm', type: 'rss', url: 'https://vllm.ai/blog/rss.xml' },
  { name: 'Ollama Blog', class: 'ollama', type: 'rss', url: 'https://ollama.com/blog/rss.xml' },
  { name: 'PyTorch Blog', class: 'pytorch', type: 'rss', url: 'https://pytorch.org/feed/' },
  { name: 'LangChain Blog', class: 'langchain', type: 'rss', url: 'https://www.langchain.com/blog/rss.xml' },
  { name: 'LlamaIndex Blog', class: 'llamaindex', type: 'html', url: 'https://www.llamaindex.ai/blog', linkPattern: /href="(\/blog\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi, exclude: [/\/blog\/?$/i, /\/blog\/page\//i] },
  {
    name: 'Vercel AI SDK',
    class: 'vercel',
    type: 'rss',
    url: 'https://vercel.com/blog/rss.xml',
    keywords: ['ai', 'agent', 'agents', 'sdk', 'model', 'llm', 'v0']
  },
  { name: 'Kimi Blog', class: 'kimi', type: 'html', url: 'https://www.kimi.com/blog/', linkPattern: /href="(https:\/\/www\.kimi\.com\/blog\/[^"#?]+|\/blog\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi, exclude: [/\/blog\/?$/i, /\/en\/blog\/?$/i] }
];

const articleCache = new Map();
const aiCache = new Map();

function escapeRegex(text = '') {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripHtml(text = '') {
  return decodeHtmlEntities(text)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(text = '') {
  return decodeHtmlEntities(text)
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipText(text = '', max = 140) {
  const value = normalizeText(text);
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isLowQualitySummary(text = '') {
  const value = normalizeText(text);
  if (!value || value.length < 24) return true;
  if (/^(click|read|view)\b/i.test(value)) return true;
  if (/^(skip to|github|release|tag:)/i.test(value)) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^\W+$/.test(value)) return true;

  const compact = value.replace(/\s+/g, '');
  const alphaHan = (compact.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
  return alphaHan / Math.max(compact.length, 1) < 0.45;
}

function keywordMatch(text = '', keywords = []) {
  if (!keywords?.length) return true;
  const value = text.toLowerCase();
  return keywords.some(keyword => value.includes(keyword.toLowerCase()));
}

function extractTagValue(item, tagName) {
  const pattern = new RegExp(`<${escapeRegex(tagName)}[^>]*>([\\s\\S]*?)<\\/${escapeRegex(tagName)}>`, 'i');
  return normalizeText((item.match(pattern)?.[1] || '').trim());
}

function extractFeedLink(item) {
  const direct = extractTagValue(item, 'link');
  if (/^https?:\/\//i.test(direct)) return direct;
  const href = item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '';
  return href || '#';
}

function extractMetaContent(html, attrName, attrValue) {
  const patterns = [
    new RegExp(`<meta[^>]+${attrName}=["']${escapeRegex(attrValue)}["'][^>]+content=["']([\\s\\S]*?)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([\\s\\S]*?)["'][^>]+${attrName}=["']${escapeRegex(attrValue)}["'][^>]*>`, 'i')
  ];
  for (const pattern of patterns) {
    const value = pattern.exec(html)?.[1];
    if (value) return normalizeText(value);
  }
  return '';
}

function extractFirstTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? normalizeText(stripHtml(match[1])) : '';
}

function extractBestTitle(html = '') {
  const title =
    extractMetaContent(html, 'property', 'og:title') ||
    extractMetaContent(html, 'name', 'twitter:title') ||
    extractFirstTagText(html, 'h1') ||
    extractFirstTagText(html, 'title');

  return normalizeText(
    title
      .replace(/\s+[|｜-]\s+(OpenAI|Anthropic|Kimi.*|LlamaIndex.*|Vercel.*|LangChain.*)$/i, '')
      .replace(/\s+Tech Blog$/i, '')
  );
}

function extractPreferredMetaDescription(html = '') {
  return (
    extractMetaContent(html, 'property', 'og:description') ||
    extractMetaContent(html, 'name', 'description') ||
    extractMetaContent(html, 'name', 'twitter:description')
  );
}

function extractReadableArticleText(html = '') {
  return normalizeText(
    decodeHtmlEntities(html)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<(header|footer|nav|aside)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function extractPublishedDateText(html = '') {
  const candidates = [
    extractMetaContent(html, 'property', 'article:published_time'),
    extractMetaContent(html, 'name', 'article:published_time'),
    html.match(/"datePublished":"([^"]+)"/i)?.[1] || '',
    html.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] || '',
    html.match(/([A-Z][a-z]{2,9} \d{1,2}, \d{4})/)?.[1] || '',
    html.match(/(20\d{2}-\d{2}-\d{2})/)?.[1] || ''
  ].filter(Boolean);
  return candidates[0] || '';
}

function humanizeSlug(link = '') {
  const slug = decodeURIComponent(link.split('/').filter(Boolean).pop() || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (!slug) return '';

  const special = new Map([
    ['ai', 'AI'],
    ['llm', 'LLM'],
    ['sdk', 'SDK'],
    ['api', 'API'],
    ['gpt', 'GPT'],
    ['vllm', 'vLLM'],
    ['claude', 'Claude'],
    ['kimi', 'Kimi']
  ]);

  return slug
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      if (special.has(lower)) return special.get(lower);
      if (/^[0-9.]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function stripListPrefixes(text = '') {
  return normalizeText(text)
    .replace(/^(Featured|Product|Announcements|Policy)\s+/i, '')
    .replace(/^[A-Z][a-z]{2,9}\s+\d{1,2},\s+\d{4}\s+/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s+/i, '')
    .trim();
}

function deriveListSummary(text = '', title = '') {
  let value = stripListPrefixes(text);
  if (title && value.toLowerCase().startsWith(title.toLowerCase())) {
    value = value.slice(title.length).trim();
  }
  value = value.replace(/^[-:：|]/, '').trim();
  return clipText(value || stripListPrefixes(text), 140);
}

function toTimestamp(value) {
  const ts = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ts) ? ts : 0;
}

function formatDate(timestamp) {
  return timestamp
    ? new Date(timestamp).toLocaleString('zh-CN', { timeZone: SHANGHAI_TZ, hour12: false })
    : '未知时间';
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xml,text/xml,application/rss+xml,application/atom+xml,*/*'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.text();
}

async function fetchArticleHtml(url) {
  if (!/^https?:\/\//i.test(url)) return '';
  if (articleCache.has(url)) return articleCache.get(url);
  try {
    const html = await fetchText(url);
    articleCache.set(url, html);
    return html;
  } catch (error) {
    console.error(`Failed to fetch article ${url}:`, error.message);
    articleCache.set(url, '');
    return '';
  }
}

async function callGitHubModel(messages, maxTokens = 160) {
  if (!GITHUB_TOKEN) return '';
  const cacheKey = JSON.stringify({ messages, maxTokens });
  if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

  try {
    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1',
        temperature: 0.2,
        max_tokens: maxTokens,
        messages
      })
    });

    if (!response.ok) {
      console.error(`GitHub Models error: HTTP ${response.status}`);
      aiCache.set(cacheKey, '');
      return '';
    }

    const data = await response.json();
    const content = normalizeText(data?.choices?.[0]?.message?.content || '');
    aiCache.set(cacheKey, content);
    return content;
  } catch (error) {
    console.error('GitHub Models request failed:', error.message);
    aiCache.set(cacheKey, '');
    return '';
  }
}

async function summarizePost(title, sourceName, text) {
  const input = normalizeText(text).slice(0, 3200);
  if (input.length < 120) return '';

  const summary = await callGitHubModel(
    [
      {
        role: 'system',
        content: '你是技术编辑。请基于输入内容生成 45 到 90 字的简体中文摘要，要求准确、自然、具体，不要空话，不要加引号，只输出摘要正文。'
      },
      {
        role: 'user',
        content: `来源：${sourceName}\n标题：${title}\n内容：${input}`
      }
    ],
    140
  );

  return clipText(summary, 120);
}

async function generateProjectIntro(posts) {
  const fallback = 'AI-RSS 聚合全球主流 AI 官方博客与技术文章源，自动抓取模型、工程、研究和产品更新，并同步生成首页与 README 最新动态，适合想快速跟进 AI 动态的开发者与研究者。';
  if (!posts.length || !GITHUB_TOKEN) return fallback;

  const latestTitles = posts
    .slice(0, 6)
    .map((post, index) => `${index + 1}. ${post.title}（${post.sourceName}）`)
    .join('\n');

  const intro = await callGitHubModel(
    [
      {
        role: 'system',
        content: '你是 GitHub README 编辑助手。请生成一段 80 到 120 字的简体中文项目简介，语气克制自然，不要标题，不要列表。'
      },
      {
        role: 'user',
        content: `项目名：AI-RSS\n用途：聚合全球 AI 官方技术文章与动态\n输出：静态首页 + README 最新动态\nREADME 展示形式：标题链接 + 来源 + 时间\n更新频率：每 3 小时自动更新\n参考最新内容：\n${latestTitles}`
      }
    ],
    180
  );

  return intro || fallback;
}

async function resolveDescription({ title, sourceName, rawDesc, articleHtml }) {
  const direct = clipText(stripHtml(rawDesc), 140);
  if (!isLowQualitySummary(direct)) return direct;

  const metaDesc = clipText(extractPreferredMetaDescription(articleHtml), 140);
  if (!isLowQualitySummary(metaDesc)) return metaDesc;

  const articleText = extractReadableArticleText(articleHtml);
  const aiSummary = await summarizePost(title, sourceName, articleText);
  if (!isLowQualitySummary(aiSummary)) return aiSummary;

  const excerpt = clipText(articleText, 140);
  if (!isLowQualitySummary(excerpt)) return excerpt;

  return '';
}

function normalizePost(post) {
  return {
    ...post,
    title: normalizeText(post.title),
    displayTitle: normalizeText(post.displayTitle || post.title),
    description: normalizeText(post.description),
    sourceName: normalizeText(post.sourceName),
    sourceClass: post.sourceClass
  };
}

function shouldKeepPost(post, feed) {
  if (!post.link || post.link === '#') return false;
  if (isLowQualitySummary(post.description)) return false;
  if (!keywordMatch(`${post.title} ${post.description} ${post.link}`, feed.keywords)) return false;
  return true;
}

async function fetchRssFeed(feed) {
  console.log(`Fetching ${feed.name}...`);
  const xml = await fetchText(feed.url);
  const items = xml.split(/<item\b[^>]*>|<entry\b[^>]*>/i).slice(1).slice(0, 6);

  const posts = [];
  for (const item of items) {
    const title = extractTagValue(item, 'title') || '未命名更新';
    const link = extractFeedLink(item);
    const rawDesc =
      extractTagValue(item, 'description') ||
      extractTagValue(item, 'summary') ||
      extractTagValue(item, 'content:encoded') ||
      extractTagValue(item, 'content');
    const pubDate =
      extractTagValue(item, 'pubDate') ||
      extractTagValue(item, 'updated') ||
      extractTagValue(item, 'published');
    const directDescription = clipText(stripHtml(rawDesc), 140);
    let articleHtml = '';
    let description = directDescription;

    if (isLowQualitySummary(description)) {
      articleHtml = await fetchArticleHtml(link);
      description = await resolveDescription({
        title,
        sourceName: feed.name,
        rawDesc,
        articleHtml
      });
    }

    const fallbackTitle = articleHtml ? extractBestTitle(articleHtml) : '';
    const timestamp = toTimestamp(pubDate) || (articleHtml ? toTimestamp(extractPublishedDateText(articleHtml)) : 0);

    const post = normalizePost({
      title,
      displayTitle: fallbackTitle || title,
      link,
      timestamp,
      dateStr: formatDate(timestamp),
      description,
      sourceName: feed.name,
      sourceClass: feed.class
    });

    if (shouldKeepPost(post, feed)) {
      posts.push(post);
    }
  }

  return posts.slice(0, 4);
}

function collectHtmlEntries(html, feed) {
  const entries = [];
  const seen = new Set();
  const regex = new RegExp(feed.linkPattern.source, feed.linkPattern.flags);
  for (const match of html.matchAll(regex)) {
    const rawHref = match[1];
    if (!rawHref) continue;
    const absoluteUrl = new URL(rawHref, feed.url).href;
    if (feed.exclude?.some(pattern => pattern.test(absoluteUrl))) continue;
    if (seen.has(absoluteUrl)) continue;
    seen.add(absoluteUrl);
    entries.push({
      link: absoluteUrl,
      text: stripHtml(match[2] || '')
    });
  }
  return entries.slice(0, 6);
}

async function fetchHtmlFeed(feed) {
  console.log(`Fetching ${feed.name}...`);
  const html = await fetchText(feed.url);
  const entries = collectHtmlEntries(html, feed);
  const posts = [];

  for (const entry of entries) {
    const link = entry.link;
    const listTitle = humanizeSlug(link);
    const listDescription = deriveListSummary(entry.text, listTitle);
    const listTimestamp = toTimestamp(entry.text.match(/([A-Z][a-z]{2,9} \d{1,2}, \d{4})/)?.[1] || entry.text.match(/(20\d{2}-\d{2}-\d{2})/)?.[1] || '');

    let articleHtml = '';
    let title = listTitle || '未命名更新';
    let description = feed.preferListText ? listDescription : '';
    let timestamp = listTimestamp;

    if (!feed.preferListText || isLowQualitySummary(description)) {
      articleHtml = await fetchArticleHtml(link);
      if (articleHtml) {
        title = extractBestTitle(articleHtml) || title;
        description = await resolveDescription({
          title,
          sourceName: feed.name,
          rawDesc: extractPreferredMetaDescription(articleHtml),
          articleHtml
        });
        timestamp = timestamp || toTimestamp(extractPublishedDateText(articleHtml));
      }
    }

    const post = normalizePost({
      title,
      displayTitle: title,
      link,
      timestamp,
      dateStr: formatDate(timestamp),
      description,
      sourceName: feed.name,
      sourceClass: feed.class
    });

    if (shouldKeepPost(post, feed)) {
      posts.push(post);
    }
  }

  return posts.slice(0, 4);
}

function renderPostsHtml(posts) {
  if (!posts.length) {
    return '<section class="empty-state">本轮没有成功抓取到可展示的资讯，请稍后再试。</section>';
  }

  return posts.map(post => `
            <article class="post-card src-${post.sourceClass}">
                <div class="post-header">
                    <h2 class="post-title"><a href="${post.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.displayTitle || post.title)}</a></h2>
                    <div class="post-meta">
                        <span class="source-badge">${escapeHtml(post.sourceName)}</span>
                        <time>${escapeHtml(post.dateStr)}</time>
                    </div>
                </div>
            </article>
  `.trim()).join('\n');
}

function renderPostsMarkdown(posts) {
  if (!posts.length) {
    return '⏳ 本轮没有成功抓取到可展示的资讯，请稍后刷新查看。';
  }

  return posts.map(post => [
    `### 📢 [${post.displayTitle || post.title}](${post.link})`,
    `来源: ${post.sourceName} | 时间: ${post.dateStr}`,
    '',
    '---'
  ].join('\n')).join('\n\n');
}

async function main() {
  const results = await Promise.all(
    feeds.map(async feed => {
      try {
        return feed.type === 'html' ? await fetchHtmlFeed(feed) : await fetchRssFeed(feed);
      } catch (error) {
        console.error(`Failed to fetch ${feed.name}:`, error.message);
        return [];
      }
    })
  );

  const deduped = [];
  const seen = new Set();
  for (const post of results.flat()) {
    const key = post.link;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }

  deduped.sort((a, b) => b.timestamp - a.timestamp);

  const indexPosts = deduped.slice(0, 25);
  const readmePosts = deduped.slice(0, 20);
  const nowStr = new Date().toLocaleString('zh-CN', { timeZone: SHANGHAI_TZ, hour12: false });
  const intro = await generateProjectIntro(indexPosts);

  const indexPath = 'index.html';
  const readmePath = 'README.md';

  const indexTemplate = await fs.readFile(indexPath, 'utf8');
  const nextIndex = indexTemplate
    .replace(
      /<!-- START_UPDATE_TIME -->[\s\S]*?<!-- END_UPDATE_TIME -->/,
      `<!-- START_UPDATE_TIME -->\n            <div class="status">系统最后自动更新于：${nowStr}（每 3 小时自动刷新）</div>\n            <!-- END_UPDATE_TIME -->`
    )
    .replace(
      /<!-- START_FEED_CONTENT -->[\s\S]*?<!-- END_FEED_CONTENT -->/,
      `<!-- START_FEED_CONTENT -->\n${renderPostsHtml(indexPosts)}\n            <!-- END_FEED_CONTENT -->`
    );

  const readmeTemplate = await fs.readFile(readmePath, 'utf8');
  const nextReadme = readmeTemplate
    .replace(
      /<!-- START_PROJECT_INTRO -->[\s\S]*?<!-- END_PROJECT_INTRO -->/,
      `<!-- START_PROJECT_INTRO -->\n${intro}\n<!-- END_PROJECT_INTRO -->`
    )
    .replace(
      /<!-- START_LIVE_FEEDS -->[\s\S]*?<!-- END_LIVE_FEEDS -->/,
      `<!-- START_LIVE_FEEDS -->\n${renderPostsMarkdown(readmePosts)}\n<!-- END_LIVE_FEEDS -->`
    )
    .replace(/🕒 最后自动更新时间：.*/u, `🕒 最后自动更新时间：${nowStr}`);

  await fs.writeFile(indexPath, nextIndex, 'utf8');
  await fs.writeFile(readmePath, nextReadme, 'utf8');
}

await main();
