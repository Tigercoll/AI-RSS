# 🤖 AI 前沿技术追踪阅读器 (AI Feeds Tracker)

系统每隔 3 小时会自动爬取全球各大前沿 AI 实验室、硬核开源社区的官方 RSS 订阅源，并在下方看板中按时间倒序混合呈现。

---

## 📅 实时 AI 技术看板 (Live Dashboard)

> 💡 **提示：** 下方内容为实时内嵌网页，如未显示或想看全屏版，请直接访问：[👉 独立全屏阅读地址](https://tigercoll.github.io/AI-RSS/)

<iframe src="https://tigercoll.github.io/AI-RSS/" width="100%" height="800px" style="border:1px solid #dee2e6; border-radius: 6px; background: #fff;">
    <p>您的浏览器不支持内嵌框架，请直接点击上方链接查看。</p>
</iframe>

---

## 💾 RSS 订阅源配置清单

如果你想把这些优质信源单独添加到你自己的阅读器（如 Feedly、Inoreader 等）中，可以直接复制以下链接或使用下方的 OPML 配置：

### 1. 核心大厂与实验室
* **OpenAI (ChatGPT):** `https://rsshub.rssforever.com/openai/news`
* **Anthropic (Claude):** `https://rsshub.rssforever.com/anthropic/research`
* **Google DeepMind (Gemini):** `https://deepmind.com/blog/feed/basic/`
* **DeepSeek (深度求索):** `https://github.com/deepseek-ai.atom`
* **智谱 GLM:** `https://rsshub.rssforever.com/zhihu/people/columns/zhipu-ai`
* **月之暗面 Kimi:** `https://rsshub.rssforever.com/moonshot/news`
* **字节豆包:** `https://rsshub.rssforever.com/volcengine/news`

### 2. 顶级社区与框架
* **Hugging Face Blog:** `https://huggingface.co/blog/feed.xml`
* **LMSYS Org:** `https://lmsys.org/rss.xml`
* **Andrej Karpathy:** `https://karpathy.github.io/feed.xml`
* **PyTorch 官方动态:** `https://pytorch.org/feed.xml`

---

## 🛠️ 一键导入配置 (OPML)

复制下方代码并在电脑上保存为 `ai_feeds.opml` 文件，即可直接导入到任何 RSS 阅读器中：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>AI前沿技术追踪</title></head>
  <body>
    <outline text="AI 前沿实验室">
      <outline text="OpenAI" type="rss" xmlUrl="[https://rsshub.rssforever.com/openai/news](https://rsshub.rssforever.com/openai/news)"/>
      <outline text="Anthropic" type="rss" xmlUrl="[https://rsshub.rssforever.com/anthropic/research](https://rsshub.rssforever.com/anthropic/research)"/>
      <outline text="Google DeepMind" type="rss" xmlUrl="[https://deepmind.com/blog/feed/basic/](https://deepmind.com/blog/feed/basic/)"/>
      <outline text="DeepSeek GitHub" type="rss" xmlUrl="[https://github.com/deepseek-ai.atom](https://github.com/deepseek-ai.atom)"/>
      <outline text="智谱 GLM" type="rss" xmlUrl="[https://rsshub.rssforever.com/zhihu/people/columns/zhipu-ai](https://rsshub.rssforever.com/zhihu/people/columns/zhipu-ai)"/>
      <outline text="月之暗面 Kimi" type="rss" xmlUrl="[https://rsshub.rssforever.com/moonshot/news](https://rsshub.rssforever.com/moonshot/news)"/>
      <outline text="字节豆包" type="rss" xmlUrl="[https://rsshub.rssforever.com/volcengine/news](https://rsshub.rssforever.com/volcengine/news)"/>
    </outline>
    <outline text="AI 顶级社区与框架">
      <outline text="Hugging Face Blog" type="rss" xmlUrl="[https://huggingface.co/blog/feed.xml](https://huggingface.co/blog/feed.xml)"/>
      <outline text="LMSYS Org" type="rss" xmlUrl="[https://lmsys.org/rss.xml](https://lmsys.org/rss.xml)"/>
      <outline text="Andrej Karpathy" type="rss" xmlUrl="[https://karpathy.github.io/feed.xml](https://karpathy.github.io/feed.xml)"/>
      <outline text="PyTorch 动态" type="rss" xmlUrl="[https://pytorch.org/feed.xml](https://pytorch.org/feed.xml)"/>
    </outline>
  </body>
</opml>