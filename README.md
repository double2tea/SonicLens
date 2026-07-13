# SonicLens

面向剪辑师的视听分析工作台。SonicLens 调用用户自己配置的 Gemini-compatible API，分析音乐、音效或短视频，生成节奏与卡点、UCS 分类、分镜、画面/原声描述、声音设计路线和 SeedAudio Prompt。

## 产品边界

- BYOK：每位用户在设置面板中填写自己的 API Key。
- API Key 仅保存在当前浏览器的 `localStorage`，不会写入仓库或 Cloudflare 构建变量。
- 音乐/音效在浏览器内解码与压缩后发送；视频模式优先发送原始 MP4，接近上传上限时在本地生成 H.264/AAC 分析代理后再发送。
- 分析历史只保存在当前浏览器，最多 50 条；报告元数据使用 `localStorage`，对应的轻量分析音频使用 `IndexedDB`，不保存原始视频。
- Cloudflare Worker 只负责静态资源和匿名使用事件，不代理模型请求。
- 多轮分析 Agent 复用同一 Gemini-compatible REST 接口和 BYOK 配置，不依赖仅本地可用的服务端 SDK。

## 本地开发

要求 Node.js 22。

```bash
npm install
cp .env.example .env.local
npm run dev
```

首次使用时，在页面右上角设置中填写 API Key、Base URL 和模型名称。

默认 API 配置：

```bash
VITE_GEMINI_BASE_URL=https://cdn.12ai.org
VITE_GEMINI_MODEL=gemini-3.5-flash
VITE_GEMINI_MAX_UPLOAD_MB=30
VITE_AUDIO_TARGET_UPLOAD_MB=12
VITE_GEMINI_MAX_OUTPUT_TOKENS=16384
```

也可以使用官方 Gemini endpoint：

```bash
VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
VITE_GEMINI_MODEL=gemini-2.5-flash
```

## 质量检查

```bash
npm run type-check
npm run lint
npm run format:check
npm run test:coverage
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `22`
- Production branch: `main`

`wrangler.toml` 配置 Pages 输出目录和 Analytics Engine binding。`public/_worker.js` 构建后成为 `dist/_worker.js`：`/api/analytics` 写入匿名事件，其余请求交给静态资源 binding。

不要在 Cloudflare Pages 中设置 `VITE_GEMINI_API_KEY`。Vite 的 `VITE_*` 值会进入公开浏览器 bundle，不适合保存共享密钥。

## 媒体与视频分析

- 音乐与音效模式接收音频或 MP4；MP4 会先在本地提取音轨。视频模式接收 MP4，并联合理解画面与声音。
- WAV 或超过目标大小的音频会转为单声道低采样率 WAV。
- 接近视频上传限制的 MP4 会提前在浏览器内转为最高 720p 的 H.264/AAC 分析代理，为 base64 请求体预留空间；原片和帧图不会写入历史记录。
- 当前报告播放器使用本次媒体；历史报告恢复对应的轻量分析音频与波形。
- 视频先以高采样率检测切点，再按固定时间线分析画面、节奏、包装与声音；SeedAudio brief 仅在用户需要时生成。
- 视频报告先给出“可交付 / 小改 / 重剪”的审片结论，再列核心问题与直接执行动作；成片已成立时允许零条强制修改，不为凑数制造建议。
- 产品类别会交叉核对标题、屏幕文字与对白；发现“洗衣液 / 柔顺剂”等证据冲突时会触发一次定向复核。
- 视频结果会经过本地证据密度、重复率与建议可执行性评分；信息偏薄时只定向深化一次并保留高分版本，仍不足则明确标记 `limited`，不会无限重试。
- 视频总时长使用浏览器读取的原片元数据校准；模型负责镜头内容与切点识别，不再自行估算片长。
- 视频报告展示可点击时间轴；当前会话可跳转原片，但历史记录只保存文字和时间码，不保存视频、帧图、base64 或 data URI。
- 分析 Agent 默认只读取结构化报告。只有用户显式选择重新查看媒体时，才会在该轮发送主分析使用的 MP4；大视频复用本地生成的安全分析代理，不重新上传原片。
- 卡点与段落支持区间循环试听，波形选区可在本地裁剪后发起局部重分析。
- 卡点试听会吸附到浏览器本地检测到的最近瞬态；模型报告中的原始时间字段保持不变。
- 历史记录支持关键词搜索、收藏与收藏筛选，状态保存在当前浏览器。
- 取消或重置分析会隔离旧请求，避免过期结果覆盖当前页面。
- 模型 JSON 会在进入 UI 和历史缓存前执行运行时结构校验。

## 匿名使用事件

生产环境发送 `analysis_started`、`analysis_completed` 和 `analysis_failed`。事件只包含模式、文件大小区间、处理时长、是否转码、模型名和短错误信息，不包含文件名、音频、API Key、Prompt 或分析结果。
