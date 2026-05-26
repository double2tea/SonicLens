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

Get a 12AI API key with this invite link:
https://new.12ai.org/register?aff=PYE8

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
VITE_GEMINI_MAX_OUTPUT_TOKENS=16384
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
VITE_GEMINI_MAX_OUTPUT_TOKENS=16384
```

After GitHub is connected, every push to `main` triggers a production deployment. Pull
requests or non-production branches can be configured as preview deployments in Cloudflare
Pages.

`wrangler.toml` also configures the Pages Functions output directory and the Analytics
Engine dataset binding used by `/api/analytics`.

`VITE_*` values are embedded in the browser bundle by Vite, so use a restricted API key
suitable for browser-side requests.

## Usage Analytics

SonicLens sends anonymous usage events to `/api/analytics/:event/:mode/:sizeBucket`.
The Pages Function validates each event and writes it to the Cloudflare Workers Analytics
Engine dataset `soniclens`.

Tracked events:

- `analysis_started`
- `analysis_completed`
- `analysis_failed`

Tracked fields are intentionally limited to mode, file size bucket, processed file size
bucket, duration, transcode flag, model, and short error message. SonicLens does not send
audio files, filenames, prompts, API keys, or analysis results to analytics.

Analytics Engine columns:

- `blob1`: event name
- `blob2`: mode
- `blob3`: original file size bucket
- `blob4`: processed file size bucket
- `blob5`: transcode flag
- `blob6`: model
- `blob7`: short error message
- `double1`: duration in milliseconds

Example weekly query:

```sql
SELECT
  blob1 AS event_name,
  blob2 AS mode,
  blob3 AS original_size_bucket,
  COUNT() AS events,
  AVG(double1) AS average_duration_ms
FROM soniclens
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY event_name, mode, original_size_bucket
ORDER BY events DESC
```

Local Pages Function smoke test:

```bash
npm run build
npx wrangler pages dev dist --port 8788
curl -i -X POST http://localhost:8788/api/analytics \
  -H 'Content-Type: application/json' \
  --data '{"eventName":"analysis_started","mode":"music","originalSizeBucket":"5-20MB"}'
```

## Media Processing

SonicLens prepares media in the browser before calling the API:

- MP4/video files are decoded locally and only the extracted analysis audio is uploaded.
- Large audio or WAV files are transcoded to mono WAV with a lower sample rate.
- `VITE_AUDIO_TARGET_UPLOAD_MB` controls the target processed audio size.
- `VITE_GEMINI_MAX_OUTPUT_TOKENS` controls the maximum model response length.
- If a detailed structured response is truncated, SonicLens automatically retries with a compact schema.
