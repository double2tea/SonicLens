# SonicLens

Music and SFX analysis for editors, powered by a Gemini-compatible API.

## API Provider

SonicLens calls the Gemini `generateContent` REST API directly. It defaults to the 12AI
Gemini-compatible endpoint:

```bash
VITE_GEMINI_BASE_URL=https://cdn.12ai.org
VITE_GEMINI_MODEL=gemini-3.5-flash
```

To use the official Gemini API instead, set:

```bash
VITE_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
VITE_GEMINI_MODEL=gemini-2.5-flash
```

The Settings panel can override API key, base URL, and model in the browser for local testing.

## Local Development

Prerequisites: Node.js 22+.

1. Install dependencies:
   `npm install`
2. Create `.env.local`:

```bash
VITE_GEMINI_API_KEY=your_12ai_key
VITE_GEMINI_BASE_URL=https://cdn.12ai.org
VITE_GEMINI_MODEL=gemini-3.5-flash
VITE_GEMINI_MAX_UPLOAD_MB=30
VITE_AUDIO_TARGET_UPLOAD_MB=12
VITE_GEMINI_MAX_OUTPUT_TOKENS=12288
```

3. Run locally:
   `npm run dev`

4. Verify before deploying:

```bash
npm run type-check
npm run build
```

## Cloudflare Pages Deployment

Connect this GitHub repository to Cloudflare Pages for automatic deployments.

Cloudflare Pages settings:

- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Production branch:** `main`
- **Node.js version:** `22`

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

Set these Cloudflare Pages environment variables before building:

```bash
VITE_GEMINI_API_KEY=your_12ai_key
VITE_GEMINI_BASE_URL=https://cdn.12ai.org
VITE_GEMINI_MODEL=gemini-3.5-flash
VITE_GEMINI_MAX_UPLOAD_MB=30
VITE_AUDIO_TARGET_UPLOAD_MB=12
VITE_GEMINI_MAX_OUTPUT_TOKENS=12288
```

After GitHub is connected, every push to `main` triggers a production deployment. Pull
requests or non-production branches can be configured as preview deployments in Cloudflare
Pages.

This is a static frontend deployment. `VITE_*` values are embedded in the browser bundle by
Vite, so use a restricted API key suitable for browser-side requests.

## Media Processing

SonicLens prepares media in the browser before calling the API:

- MP4/video files are decoded locally and only the extracted analysis audio is uploaded.
- Large audio or WAV files are transcoded to mono WAV with a lower sample rate.
- `VITE_AUDIO_TARGET_UPLOAD_MB` controls the target processed audio size.
- `VITE_GEMINI_MAX_OUTPUT_TOKENS` controls the maximum model response length.
