# FileSnaps

Temporary, encrypted file and code snippet sharing. No accounts. No tracking. Just a link and a password.

---

## Table of Contents

- [Stack](#stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Security Model](#security-model)
- [UI/UX Design System](#uiux-design-system)
- [API Reference](#api-reference)
- [Key Flows](#key-flows)
- [Development](#development)
- [Deployment](#deployment)

---

## Stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | React 19 with Vite 8 |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI (tabs, select, switch, dialog, progress, scroll-area) |
| Icons | Lucide React |
| Syntax highlighting | highlight.js |
| QR codes | qrcode |
| Toasts | sonner |
| Font | Outfit (body, weight 500) + JetBrains Mono (code) |
| Crypto | Web Crypto API (AES-256-GCM, PBKDF2, SHA-256) |

### Backend (Worker)

| Layer | Choice |
|-------|--------|
| Runtime | Cloudflare Workers |
| Framework | Hono v4 |
| Storage (files) | Cloudflare R2 (S3-compatible) |
| Storage (metadata) | Cloudflare KV |
| Auth | Turnstile (CAPTCHA) |
| Deploy | Wrangler CLI |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Cloudflare Workers | Edge compute, serves the API + static assets |
| Cloudflare R2 | File blob storage (encrypted at rest) |
| Cloudflare KV | Metadata store (file meta, password hashes, tokens) |
| Cloudflare Turnstile | Bot protection on upload |
| Cloudflare Assets | SPA hosting (Workers + static files) |

---

## Architecture

```
                    ┌─────────────┐
                    │   Browser   │
                    │  (React SPA)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         /api/*       /assets/*    SPA fallback
              │            │            │
              ▼            ▼            ▼
        ┌──────────────────────────────────┐
        │       Cloudflare Worker          │
        │         (Hono + R2 + KV)         │
        └──────┬──────────────────┬────────┘
               │                  │
         ┌─────▼─────┐     ┌─────▼─────┐
         │  R2 Bucket │     │  KV Store │
         │  (encrypted│     │  (meta,   │
         │   blobs)   │     │  hashes)  │
         └───────────┘     └───────────┘
```

### Design Philosophy

- **Encrypt at the edge, decrypt at the client**: Server never sees plaintext. Files are encrypted in the browser before upload, decrypted after download.
- **Stateless auth**: Passwords are hashed with SHA-256 + random salt. Share tokens (for link-based access) are random 18-char strings stored alongside the hash.
- **Ephemeral by default**: Every file has an expiration. Files are garbage-collected on read when expired.
- **No persistence beyond intent**: No user accounts, no session cookies, no tracking pixels. The only storage is the file itself and its encrypted metadata.

---

## Project Structure

```
filesnaps/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── App.jsx              # Root: header, theme, routes, about page, tool selector
│   │   ├── main.jsx             # Entry: BrowserRouter, Toaster
│   │   ├── index.css            # Tailwind v4, dark/light theme, animations, HLJS themes
│   │   ├── lib/
│   │   │   └── utils.js         # cn() — clsx + tailwind-merge
│   │   ├── components/
│   │   │   ├── Shared.jsx       # Shared exports: encryptFile, decryptFile, deriveKey,
│   │   │   │                    #   PasswordStrength, CopyButton, FileIcon, formatBytes,
│   │   │   │                    #   SearchableSelect, FloatingLabelInput, RecentSection,
│   │   │   │                    #   useRecentUploads, useKeyboardSubmit
│   │   │   └── ui/              # Radix-based primitives
│   │   │       ├── button.jsx   # cva variants: default, destructive, outline, secondary, ghost, link
│   │   │       ├── card.jsx
│   │   │       ├── badge.jsx
│   │   │       ├── skeleton.jsx
│   │   │       ├── progress.jsx
│   │   │       ├── select.jsx
│   │   │       ├── switch.jsx
│   │   │       ├── tabs.jsx
│   │   │       ├── dialog.jsx
│   │   │       ├── alert-dialog.jsx
│   │   │       ├── input.jsx
│   │   │       ├── label.jsx
│   │   │       ├── separator.jsx
│   │   │       ├── scroll-area.jsx
│   │   │       └── tooltip.jsx
│   │   └── pages/
│   │       ├── UploadPage.jsx       # File upload form + success view
│   │       ├── SnippetPage.jsx      # Code snippet editor + success view
│   │       ├── DownloadPage.jsx     # File/snippet download + preview + decrypt
│   │       ├── FullEditorPage.jsx   # Full-screen snippet editor
│   │       ├── ManagePage.jsx       # Admin management (expire, delete, settings)
│   │       └── Toolbar.jsx          # (not used standalone)
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── package.json
│
├── worker/                      # Cloudflare Worker
│   ├── src/
│   │   └── index.js             # Hono app — all API routes
│   ├── wrangler.toml            # Worker config (R2, KV bindings, assets)
│   └── package.json
│
├── package.json                 # Root orchestration scripts
├── DOCUMENTATION.md
└── README.md
```

---

## Security Model

### Encryption Layers

```
                 Client-side (browser)
                 ┌─────────────────────────┐
                 │  Original file (plain)   │
                 │         │                │
                 │  AES-256-GCM encrypt     │
                 │  (key = PBKDF2(password, │
                 │   salt, 600K iterations))│
                 │         │                │
                 │  IV (12 bytes) + cipher  │
                 └─────────┬───────────────┘
                           │
                 Server never sees plaintext
                           │
                 ┌─────────▼───────────────┐
                 │  R2: IV || ciphertext    │
                 │  KV: passwordHash, salt,  │
                 │       encryptionSalt,     │
                 │       tokens, metadata    │
                 └─────────────────────────┘
```

### Key Derivation (PBKDF2)

| Parameter | Value |
|-----------|-------|
| Algorithm | PBKDF2 with HMAC-SHA-256 |
| Iterations | 600,000 |
| Key length | 256 bits |
| Salt | `crypto.randomUUID()` per upload |

### Encryption (AES-GCM)

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| Key size | 256 bits |
| IV | 12 random bytes |
| Format | `IV (12 bytes) \|\| ciphertext \|\| auth tag (16 bytes)` |

### Server-Side Auth

- Password is **not stored**. Only its SHA-256 hash (with a random 16-byte salt) is stored in KV.
- Share tokens are random 18-char alphanumeric strings (`st_*`), stored alongside the hash. Used for link-based access without password prompt.
- Admin tokens (`adm_*`) for management endpoints.
- Wrong password counter locks the file after 5 failed attempts (15-minute block).
- Turnstile CAPTCHA required on every upload.

### What the Server Knows

- The encrypted blob (IV + ciphertext — meaningless without the key)
- File metadata: name, size, MIME type, timestamps
- Password hash + salt
- Share token, admin token
- Download count

### What the Server Does NOT Know

- File content (plaintext)
- Password (only the hash)
- Decryption key

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Server compromise / subpoena | Files are client-side encrypted. Server only has ciphertext. |
| Brute force password guess | 600K PBKDF2 iterations + rate limiting (5 attempts → 15 min lockout) |
| Intercepted link | Password required (or share token, which is 19 chars of random) |
| Expired file recovery | Files are permanently deleted from R2 + KV |
| MITM | All traffic over HTTPS |
| XSS | CSP headers, no `dangerouslySetInnerHTML` on user content |

---

## UI/UX Design System

### Theme

- Default: Dark mode (light theme available via toggle)
- Three toggle states: System / Dark / Light
- Active state: subtle `bg-surface-hover text-text-secondary` (muted, no color flash)
- Smooth transitions (300ms) on theme switch

### Color Tokens

All colors are defined as CSS custom properties via Tailwind v4 `@theme`:

```
Surface:        #000000 → #f8f8fc (light)
Surface-raised:  #0d0d14 → #ffffff
Surface-overlay: #161626 → #efeff4
Surface-hover:   #1e1e32 → #e6e6ee

Accent:    #8b5cf6 (purple) — primary actions, focus rings, active states
Success:   #4ade80 (green)  — success views, badges
Warning:   #fbbf24 (amber)  — burn after reading, urgent timers
Danger:    #f87171 (red)    — errors, destructive actions

Text-primary:   #ffffff → #18181b
Text-secondary: #c4c4d4 → #3f3f46
Text-muted:     #8888a0 → #63636e

Border-default: #27273d → #c8c8d4
Border-hover:   #3a3a55 → #a8a8b6
```

### Typography

| Usage | Font | Weight |
|-------|------|--------|
| Body | Outfit | 500 |
| Code | JetBrains Mono | 400 |
| Body size | 15px | — |
| Line height | 1.65 | — |

### Animations

All animations are disabled when `prefers-reduced-motion: reduce` is set.

| Name | Timing | Use |
|------|--------|-----|
| `fade-in` | 300ms | Generic entrance, modals, errors, toasts |
| `slide-up` | 400ms | Cards, success views, page transitions |
| `slide-down` | 300ms | Accordion sections, expandable panels |
| `scale-in` | 200ms | Dropdowns, modals, QR codes |
| `pulse-glow` | 2s infinite | Urgent countdown timers (< 1 hour) |
| `shimmer` | 2s infinite | Progress bar, skeleton loaders |

### Component Patterns

- **Cards**: `bg-surface-raised border border-border-default rounded-2xl shadow-sm card-hover` — hover effect is `box-shadow` + `border-color` only (no movement/scale).
- **Buttons**: All variants use `transition-all duration-200`. Hover changes are color/shadow only.
- **Inputs**: `bg-surface-raised border border-border-default` with `hover:border-border-hover` and `focus:border-accent/40 focus:ring-1 focus:ring-accent/20`.
- **File drag zone**: Gradient animated border on drag over (`gradient-border-animated`).
- **Skeletons**: `animate-pulse` with `bg-border-default`.

### Layout

- Main content: `max-w-4xl mx-auto px-4 sm:px-6`
- Navbar matches content width
- Recent section: bottom of tool page with `mt-8 pt-6 border-t`
- Download page: full-height centered layout with `max-w-3xl`

---

## API Reference

All routes are prefixed with `/api`. The worker serves both the API and the SPA assets.

### `POST /api/upload`

Upload files. Requires Turnstile CAPTCHA.

**FormData fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | One or more files (append multiple) |
| `password` | string | Yes | Min 8 characters |
| `expiration` | string | No | Minutes (default `60`, options: 1/5/15/30/60/360/1440/2880/10080) |
| `deleteAfterDownload` | string | No | `"true"` to delete after first download |
| `burnAfterReading` | string | No | `"true"` for view-once in browser |
| `maxDownloads` | string | No | Max download count (empty = unlimited) |
| `customSlug` | string | No | Custom URL slug (3-32 chars, lowercase, hyphens allowed) |
| `encryptionSalt` | string | Yes | UUID for PBKDF2 salt |
| `cf-turnstile-response` | string | Yes | Turnstile widget token |

**Response (200):**
```json
{
  "id": "kc3mbkk9",
  "shareToken": "st_sxuc436drqi3g4a1cu",
  "adminToken": "adm_zx9kq2...",
  "fileCount": 1,
  "files": [{ "name": "photo.png", "size": 12345 }],
  "expiresAt": 1718000000000,
  "createdAt": 1717996400000,
  "deleteAfterDownload": false,
  "burnAfterReading": false,
  "maxDownloads": 0,
  "encryptionSalt": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `GET /api/files/:id`

Download a file. For burn-after-reading files, the response is served inline with `no-store` caching. For all others, it's served as `attachment`.

**Query params:**

| Param | Description |
|-------|-------------|
| `password` | File password (required if no token) |
| `token` | Share token from link |
| `file` | File index for multi-file uploads (default `0`) |

**Response:** Raw file blob with appropriate `Content-Type` and `Content-Disposition` headers.

### `GET /api/files/:id/meta`

Get file metadata (no auth required, publicly readable).

**Response (200):**
```json
{
  "originalName": "photo.png",
  "size": 12345,
  "contentType": "image/png",
  "files": [{ "name": "photo.png", "size": 12345, "type": "image/png", "index": 0 }],
  "fileCount": 1,
  "expiresAt": 1718000000000,
  "downloadCount": 0,
  "wrongPasswordCount": 0,
  "encryptionSalt": "550e8400-...",
  "burnAfterReading": false,
  "maxDownloads": 0,
  "expired": false,
  "downloadLimitReached": false
}
```

### `GET /api/files/:id/preview`

Preview a file (returns base64 data URL). Does **not** increment download count. Limited to 10 MB.

**Auth:** Same as download (password or token).

**Response (200):**
```json
{
  "type": "image/png",
  "name": "photo.png",
  "size": 12345,
  "dataUrl": "data:image/png;base64,..."
}
```

### `GET /api/check-slug/:slug`

Check if a custom slug is available.

### `GET /api/manage/:id`

Get management info. Requires `X-Admin-Token` header.

### `POST /api/manage/:id/delete`

Delete file permanently. Requires admin token.

### `POST /api/manage/:id/expire`

Set file as expired immediately. Requires admin token.

### `POST /api/manage/:id/update`

Update file settings (max downloads, burn after reading, expiration). Requires admin token.

---

## Key Flows

### File Upload

```
1. User drops files → browser reads them as File objects
2. User enters password
3. On submit:
   a. Generate encryptionSalt (crypto.randomUUID())
   b. For each file:
      - Derive key: PBKDF2(password, encryptionSalt, 600K iterations)
      - Encrypt: AES-256-GCM(file bytes, key, random 12-byte IV)
      - Format: IV (12 bytes) || ciphertext
      - Wrap in File (preserving original name + type)
   c. Build FormData: encrypted files + password + encryptionSalt + options + Turnstile
   d. POST /api/upload (via XHR for progress tracking)
4. Server stores encrypted blob in R2, metadata + password hash in KV
5. Server returns { id, shareToken, adminToken, encryptionSalt, ... }
6. Success view shows share link, password card, Copy encrypted link button
```

### File Download (Password)

```
1. Recipient opens /files/:id
2. Client fetches /api/files/:id/meta → checks encryptionSalt
3. Recipient enters password
4. Client fetches /api/files/:id?password=xxx (download endpoint)
   - Server validates password hash vs stored hash
   - Server increments downloadCount
   - If maxDownloads reached / burn / deleteAfterDownload → cleanup R2 + KV
   - Server returns encrypted blob
5. Client decrypts: extract IV (first 12 bytes), AES-256-GCM.decrypt(remaining, derived key)
6. If code file: decode as text → highlight.js → render with line numbers
7. If previewable (image/video/audio/PDF): create blob URL → render inline
8. Otherwise: trigger download with original filename
```

### File Download (Share Token)

```
1. Recipient opens /files/:id?token=st_xxx
2. Client extracts token → stores in sessionStorage → replaces URL (removes query)
3. Client fetches meta, sees encryptionSalt
4. If key is also in URL (?key=xxx): auto-decrypt, no password prompt
5. If no key in URL: show password input with "Link access is granted. Enter password to decrypt."
6. Fetch download endpoint with ?token=xxx (bypasses server password auth)
7. Client decrypts with password (from URL key or user input)
```

### Snippet Create

```
1. User selects language, types/pastes code
2. Toggle "Password protect":
   - ON: user enters password
   - OFF: auto-generates random 16-char password
3. On create:
   a. Same encryption flow as file upload (PBKDF2 + AES-GCM)
   b. Encrypted content wrapped in File named snippet.{ext}
   c. POST /api/upload with encrypted file + password + encryptionSalt
4. Success view shows:
   - Password ON: share link + password card (copy separately)
   - Password OFF: share link with ?token=...&key=... (single-click)
```

### Burn After Reading

```
1. Upload with burnAfterReading = true
2. Download: the download endpoint is called once
   - Server returns blob with inline disposition, no-store cache
   - Server cleans up R2 + KV immediately after serving
3. Client decrypts and displays content inline
4. Refresh or revisit → "Not found"
```

---

## Development

### Prerequisites

- Node.js 20+
- Cloudflare account (for R2 + KV bindings)
- Wrangler CLI (`npm install -g wrangler`)

### Local Setup

```bash
git clone <repo>
npm run install:all    # or: cd frontend && npm install && cd ../worker && npm install
```

### Environment Variables

The worker needs these secrets:

```bash
cd worker
wrangler secret put TURNSTILE_SECRET    # Cloudflare Turnstile secret key
```

R2 bucket and KV namespace are configured in `wrangler.toml`. For local dev, create a `.dev.vars` file:

```
TURNSTILE_SECRET=0x4AAAAAA...
```

And ensure R2 + KV are available locally (Wrangler uses `--r2` and `--kv` flags or binding definitions in `wrangler.toml`).

### Running Locally

```bash
# Terminal 1 — worker (port 8787)
cd worker && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Vite proxies `/api` requests to `localhost:8787`.

### Build

```bash
npm run build    # builds frontend only
# or
cd frontend && npm run build
```

### Lint

```bash
cd frontend && npm run lint
```

The project uses ESLint with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.

### No Tests

The project has no test suite. Manual testing is required for any changes.

---

## Deployment

### Worker

```bash
cd worker
wrangler deploy    # deploys to Cloudflare edge
```

The worker serves both the API and the SPA assets (configured in `wrangler.toml`):

```toml
[assets]
directory = "../frontend/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

### Full Deploy (Frontend + Worker)

```bash
npm run deploy
# Runs: cd frontend && npm run build && cd ../worker && npm run deploy
```

### Stored Uploads (Client-Side Admin)

When a file is uploaded, the response (including `adminToken`) is saved to `localStorage['filesnaps_uploads']`. This enables the manage page (`/manage/:id`) to let users:

- View stats (downloads, attempts, expiration)
- Expire the file immediately
- Update max downloads, burn-after-reading setting
- Delete permanently

This is client-side only — if localStorage is cleared, the admin token is lost. There is no server-side admin recovery.

---

## Contributing

This is a solo project. If you find issues or want to contribute, open a PR or issue on the repository.
