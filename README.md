# 🤖 AI 前沿技术追踪阅读器 (AI Feeds Tracker)

<!-- START_PROJECT_INTRO -->
AI-RSS 是一个自动聚合全球主流 AI 官方动态的静态阅读项目，定时抓取 OpenAI、Anthropic、Google DeepMind、Hugging Face 等信源，并同步生成网页与 README 摘要，方便快速跟踪前沿模型、论文和产品更新。
<!-- END_PROJECT_INTRO -->

👉 **[🌐 点击这里进入专属独立阅读主页](https://tigercoll.github.io/AI-RSS/)**

⏳ 最后自动更新时间：正在等待下一次同步...

---

## 📅 实时 AI 技术看板 (Live Dashboard)

<!-- START_LIVE_FEEDS -->
⚡ GitHub Actions 会在下一次运行时自动把最新资讯填充到这里。
<!-- END_LIVE_FEEDS -->

---

## 💾 RSS 订阅源配置清单

如果你想把这些优质信源单独添加到你自己的阅读器中，可以直接复制以下链接：

* **OpenAI (ChatGPT):** `https://rsshub.rssforever.com/openai/news`
* **Anthropic (Claude):** `https://rsshub.rssforever.com/anthropic/research`
* **Google DeepMind (Gemini):** `https://deepmind.com/blog/feed/basic/`
* **DeepSeek (深度求索):** `https://github.com/deepseek-ai.atom`
* **智谱 GLM:** `https://rsshub.rssforever.com/zhihu/people/columns/zhipu-ai`
* **月之暗面 Kimi:** `https://rsshub.rssforever.com/moonshot/news`
* **字节豆包:** `https://rsshub.rssforever.com/volcengine/news`
* **Hugging Face Blog:** `https://huggingface.co/blog/feed.xml`
* **HF Daily Papers:** `https://rsshub.rssforever.com/huggingface/daily-papers`
* **arXiv AI 论文:** `https://rsshub.rssforever.com/arxiv/cs.AI`
* **Meta AI Research:** `https://ai.meta.com/blog/rss/`
* **LangChain Blog:** `https://blog.langchain.dev/rss/`
* **LlamaIndex Blog:** `https://llamahub.ai/blog/feed.xml`
* **Vercel AI SDK:** `https://github.com/vercel/ai.atom`
* **NVIDIA News:** `https://nvidianews.nvidia.com/releases.xml`
* **AMD AI Blog:** `https://community.amd.com/t5/ai/bg-p/ai-blog/rss-v2?page-size=10`
* **LMSYS Org:** `https://lmsys.org/rss.xml`
* **Andrej Karpathy:** `https://karpathy.github.io/feed.xml`

---

## ⚙️ 自动化说明

- GitHub Actions 每 3 小时自动抓取一次信源
- 首页 `index.html` 会生成可直接浏览的静态阅读页
- `README.md` 会自动更新项目简介、最近动态与最后同步时间
- 项目简介由 GitHub Models 自动生成；动态摘要优先使用 RSS 正文清洗结果
