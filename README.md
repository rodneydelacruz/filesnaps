# FileSnaps

Secure, temporary file and code snippet sharing. No accounts. No tracking. Just a link and a password.

Files are encrypted in the browser before upload and decrypted after download — the server never sees plaintext.

## Features

- **Client-side encryption** — AES-256-GCM with PBKDF2 (600K iterations)
- **Password protection** — SHA-256 hashed passwords with random salt
- **Auto-expiring links** — 1 minute to 7 days
- **Burn after reading** — view once, then permanently deleted
- **Code snippets** — syntax highlighting with 20+ languages
- **Multi-file uploads** — drag-and-drop, paste from clipboard
- **QR code sharing** — generate QR codes for any share link
- **Admin management** — expire, delete, or update settings after upload
- **Dark/light/system theme** — persisted preference
- **No accounts** — fully anonymous

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 + React Router 7 |
| Backend | Cloudflare Worker (Hono v4) |
| Storage | Cloudflare R2 (file blobs) + KV (metadata) |
| Auth | Cloudflare Turnstile (CAPTCHA) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2, SHA-256) |

## Project Structure

```
filesnaps/
├── frontend/              # React SPA
│   └── src/
│       ├── App.jsx        # Root component, routing, theme
│       ├── main.jsx       # Entry point
│       ├── index.css      # Tailwind v4, themes, animations
│       ├── lib/
│       │   └── utils.js   # cn() utility
│       ├── components/
│       │   ├── Shared.jsx # Encryption, UI helpers, hooks
│       │   └── ui/        # Radix-based primitives
│       └── pages/
│           ├── UploadPage.jsx
│           ├── SnippetPage.jsx
│           ├── DownloadPage.jsx
│           ├── FullEditorPage.jsx
│           └── ManagePage.jsx
├── worker/                # Cloudflare Worker
│   ├── src/
│   │   └── index.js       # Hono app — all API routes
│   ├── wrangler.toml
│   └── package.json
├── .github/workflows/     # CI pipeline
├── package.json           # Root orchestration scripts
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

## Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- A Cloudflare account with:
  - An R2 bucket (e.g. `filesnaps-uploads`)
  - A KV namespace

## Setup

```bash
# Clone and install
git clone <repo-url>
cd filesnaps
npm install
npm run install:all

# Configure Cloudflare resources
# 1. Create an R2 bucket and update worker/wrangler.toml [[r2_buckets]]
# 2. Create a KV namespace and update worker/wrangler.toml [[kv_namespaces]]
# 3. Set Turnstile secret:
cd worker
wranger secret put TURNSTILE_SECRET

# For local dev, create worker/.dev.vars:
echo "TURNSTILE_SECRET=your-secret" > .dev.vars
```

## Development

```bash
# Start both frontend and worker
npm run dev

# Or run separately
npm run dev:frontend    # Vite on :5173
npm run dev:worker      # Wrangler on :8787
```

The Vite dev server proxies `/api/*` requests to `localhost:8787`.

## Lint

```bash
cd frontend && npm run lint
```

## API Endpoints

### `POST /api/upload`
Upload files with password protection. Requires Turnstile CAPTCHA.

### `GET /api/files/:id`
Download a file. Auth via `?password=` or `?token=`.

### `GET /api/files/:id/meta`
Get file metadata (no auth required).

### `GET /api/files/:id/preview`
Preview a file as base64 data URL (10 MB limit).

### `GET /api/check-slug/:slug`
Check custom slug availability.

### `GET /api/manage/:id`
Get management info. Requires `X-Admin-Token` header.

### `POST /api/manage/:id/delete` | `/expire` | `/update`
Admin actions. Requires `X-Admin-Token` header.

## Deployment

```bash
npm run build     # Build frontend
npm run deploy    # Build + deploy worker to Cloudflare
```

## CI/CD

Pull requests to `main` automatically run lint and build via GitHub Actions. See `.github/workflows/ci.yml`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
