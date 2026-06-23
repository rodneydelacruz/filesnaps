# FileSnaps

Secure, temporary file sharing with password protection. Upload a file, set a password, share the link — the file auto-expires after the duration you choose.

## Architecture

| Layer    | Stack                                        |
| -------- | -------------------------------------------- |
| Frontend | React 19 + Vite + Tailwind CSS + React Router|
| Backend  | Cloudflare Worker (Hono.js)                  |
| Storage  | Cloudflare R2 (files) + KV (passwords & expiry) |

## Project Structure

```
filesnaps/
├── frontend/          # React SPA
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.jsx
│       │   └── DownloadPage.jsx
│       ├── App.jsx
│       └── main.jsx
├── worker/            # Cloudflare Worker
│   ├── src/
│   │   └── index.js
│   └── wrangler.toml
└── package.json       # Root orchestration scripts
```

## Prerequisites

- Node.js 18+
- [Cloudflare Workers CLI](https://developers.cloudflare.com/workers/wrangler/) (`wrangler`)
- A Cloudflare account with:
  - An R2 bucket named `filesnaps-uploads`
  - A KV namespace with ID replaced in `worker/wrangler.toml`

## Setup

```bash
# Install all dependencies
npm install
npm run install:all

# Update worker/wrangler.toml with your KV namespace ID
# Replace "filesnaps-meta" with your actual KV namespace ID
```

## Development

```bash
# Start both frontend and worker
npm run dev

# Or run separately
npm run dev:frontend    # Vite dev server on :5173
npm run dev:worker      # Wrangler dev server on :8787
```

The Vite dev server proxies `/api/*` requests to the Worker at `localhost:8787`.

## API Endpoints

### `POST /api/upload`
Upload a file with password protection.

**Body** (multipart/form-data):
- `file` — the file to upload (max 100 MB)
- `password` — download password (min 3 chars)
- `expiration` — hours until expiry (1, 6, 24, 48, 168)

**Response**: `{ id: "abc123", expiresAt: 1717000000000 }`

### `GET /api/files/:id`
Download a file. Requires password via query param or `X-File-Password` header.

### `GET /api/files/:id/meta`
Get file metadata (name, size, expiry) without the password.

## Deployment

```bash
npm run build     # Build frontend to frontend/dist
npm run deploy    # Deploy Worker to Cloudflare
```
