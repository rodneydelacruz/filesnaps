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
  - An R2 bucket
  - A KV namespace
  - Turnstile widget (site key + secret key)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd filesnaps
npm install
npm run install:all
```

### 2. Configure Cloudflare resources

Create these in your [Cloudflare Dashboard](https://dash.cloudflare.com/):

| Resource | How to create |
|---|---|
| R2 bucket | R2 → Create bucket (e.g. `filesnaps-uploads`) |
| KV namespace | Workers & Pages → KV → Create namespace |
| Turnstile widget | Turnstile → Add site (use your domain) |

### 3. Update worker config

Open `worker/wrangler.toml` and set your values:

```toml
[[r2_buckets]]
binding = "FILES_BUCKET"
bucket_name = "filesnaps-uploads"    # your R2 bucket name

[[kv_namespaces]]
binding = "FILE_META"
id = "YOUR_KV_NAMESPACE_ID"          # your KV namespace ID
```

### 4. Set worker secrets

```bash
cd worker
wrangler secret put TURNSTILE_SECRET   # your Turnstile secret key
wrangler secret put ALLOWED_ORIGINS    # comma-separated, e.g. https://yourdomain.com
```

### 5. Configure frontend (optional)

Create `frontend/.env` to override the default Turnstile site key:

```env
VITE_TURNSTILE_SITEKEY=0x4AAAA...
```

A default key is already embedded so this step is optional for local dev.

### 6. Local development env files

Create local env files from the examples:

```bash
cp worker/.dev.vars.example worker/.dev.vars
cp frontend/.env.example frontend/.env
```

Edit these files with your actual keys.

## Development

```bash
# Start both frontend and worker
npm run dev

# Or run separately
npm run dev:frontend    # Vite dev server on :5173
npm run dev:worker      # Wrangler dev server on :8787
```

The Vite dev server proxies `/api/*` requests to `localhost:8787`.

## Lint

```bash
cd frontend && npm run lint
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload files (requires Turnstile) |
| GET | `/api/files/:id` | Download a file |
| GET | `/api/files/:id/meta` | Get file metadata |
| GET | `/api/files/:id/preview` | Preview a file (10 MB limit) |
| GET | `/api/check-slug/:slug` | Check custom slug availability |
| GET | `/api/manage/:id` | Get management info (requires admin token) |
| POST | `/api/manage/:id/delete` | Delete file permanently |
| POST | `/api/manage/:id/expire` | Expire file immediately |
| POST | `/api/manage/:id/update` | Update file settings |

## Deployment

```bash
npm run build     # Build frontend
npm run deploy    # Build + deploy worker to Cloudflare
```

## CI/CD

Pull requests to `main` automatically run lint and build via GitHub Actions. See `.github/workflows/ci.yml`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
