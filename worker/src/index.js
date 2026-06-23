import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

const ALLOWED_ORIGINS = ['https://filesnaps.rodneydelacruz.space', 'http://localhost:5173', 'http://localhost:8787']

app.use('*', cors({
  origin: (origin) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return origin
    return null
  },
  credentials: true,
}))

app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com")
})

const MAX_TTL = 7776000
const MAX_WRONG_PASSWORDS = 5
const MAX_PREVIEW_SIZE = 10 * 1024 * 1024
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TOKEN_PREFIX = 'st_'

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += chars[buf[i] % chars.length]
  }
  return id
}

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const buf = new Uint8Array(18)
  crypto.getRandomValues(buf)
  let t = ''
  for (let i = 0; i < 18; i++) {
    t += chars[buf[i] % chars.length]
  }
  return TOKEN_PREFIX + t
}

function sanitizeFilename(name) {
  return name.replace(/[^\x20-\x7E]/g, '').replace(/["'\\;:\r\n]/g, '').slice(0, 255) || 'download'
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function randomSalt() {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getMeta(env, id) {
  const raw = await env.FILE_META.get(id)
  if (!raw) return null
  return JSON.parse(raw)
}

async function saveMeta(env, id, meta) {
  await env.FILE_META.put(id, JSON.stringify(meta))
}

app.get('/api/check-slug/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (!slug || !SLUG_REGEX.test(slug) || slug.length < 3 || slug.length > 32) {
    return c.json({ available: false, error: 'Invalid format (3-32 chars, lowercase alphanumeric with hyphens)' }, 200)
  }
  const exists = await c.env.FILE_META.get(slug)
  return c.json({ available: !exists })
})

app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const files = formData.getAll('file')
  const password = formData.get('password')?.toString()
  const expirationMinutes = parseInt(formData.get('expiration')?.toString() || '60', 10)
  const deleteAfterDownload = formData.get('deleteAfterDownload') === 'true'
  const maxDownloads = parseInt(formData.get('maxDownloads')?.toString() || '0', 10) || 0
  const burnAfterReading = formData.get('burnAfterReading') === 'true'
  const customSlug = formData.get('customSlug')?.toString()?.toLowerCase()
  const encryptionSalt = formData.get('encryptionSalt')?.toString()

  if (!files.length || !password) {
    return c.json({ error: 'File and password are required.' }, 400)
  }

  for (const f of files) {
    if (f.size > 100 * 1024 * 1024) {
      return c.json({ error: `"${f.name}" exceeds the 100 MB limit.` }, 400)
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > 100 * 1024 * 1024) {
    return c.json({ error: 'Total file size exceeds the 100 MB limit.' }, 400)
  }

  const turnstileToken = formData.get('cf-turnstile-response')?.toString()
  if (!turnstileToken) {
    return c.json({ error: 'Security verification required. Please refresh and try again.' }, 400)
  }
  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${c.env.TURNSTILE_SECRET}&response=${turnstileToken}`,
  })
  const turnstileData = await turnstileRes.json()
  if (!turnstileData.success) {
    return c.json({ error: 'Security verification failed. Please refresh and try again.' }, 403)
  }

  if (!deleteAfterDownload && (isNaN(expirationMinutes) || expirationMinutes < 1)) {
    return c.json({ error: 'Invalid expiration.' }, 400)
  }

  let id = customSlug || null
  if (id) {
    if (!SLUG_REGEX.test(id) || id.length < 3 || id.length > 32) {
      return c.json({ error: 'Custom code must be 3-32 lowercase alphanumeric characters with optional hyphens.' }, 400)
    }
    const exists = await c.env.FILE_META.get(id)
    if (exists) return c.json({ error: 'That code is already taken.' }, 409)
  } else {
    id = generateId()
  }

  const salt = await randomSalt()
  const passwordHash = await hashPassword(password, salt)
  const shareToken = generateToken()
  const adminToken = 'adm_' + generateToken()
  const createdAt = Date.now()
  const expiresAt = deleteAfterDownload ? 0 : createdAt + expirationMinutes * 60 * 1000

  const fileMetas = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const fileKey = files.length === 1 ? id : `${id}/${i}`
    await c.env.FILES_BUCKET.put(fileKey, f.stream(), {
      httpMetadata: { contentType: f.type },
      customMetadata: { originalName: f.name, fileIndex: String(i) },
    })
    fileMetas.push({ name: f.name, size: f.size, type: f.type, index: i })
  }

  const meta = {
    passwordHash,
    salt,
    encryptionSalt: encryptionSalt || null,
    shareToken,
    adminToken,
    createdAt,
    expiresAt,
    deleteAfterDownload,
    burnAfterReading: burnAfterReading || false,
    maxDownloads: maxDownloads || 0,
    downloadCount: 0,
    wrongPasswordCount: 0,
    fileCount: files.length,
    files: fileMetas,
  }

  const kvTtl = deleteAfterDownload ? MAX_TTL : Math.max(expirationMinutes * 60, 60)
  await c.env.FILE_META.put(id, JSON.stringify(meta), { expirationTtl: kvTtl })

  return c.json({
    id,
    shareToken,
    adminToken,
    fileCount: files.length,
    files: fileMetas.map(f => ({ name: f.name, size: f.size })),
    expiresAt: expiresAt || null,
    createdAt,
    deleteAfterDownload,
    burnAfterReading: burnAfterReading || false,
    maxDownloads: maxDownloads || 0,
    encryptionSalt: encryptionSalt || null,
  })
})

app.get('/api/files/:id', async (c) => {
  const id = c.req.param('id')
  const password = c.req.query('password')
  const token = c.req.query('token') || c.req.header('X-File-Token')
  const fileIndex = parseInt(c.req.query('file') || '0', 10)

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)

  if (!meta.deleteAfterDownload && meta.expiresAt && Date.now() > meta.expiresAt) {
    await cleanupFile(c.env, id, meta)
    return c.json({ error: 'File has expired.' }, 410)
  }

  if (meta.maxDownloads > 0 && meta.downloadCount >= meta.maxDownloads) {
    return c.json({ error: 'Download limit reached.' }, 410)
  }

  if (!token && !password) {
    return c.json({ error: 'Password is required.' }, 400)
  }

  const tokenValid = token && meta.shareToken && token === meta.shareToken

  if (!tokenValid) {
    if (meta.wrongPasswordCount >= MAX_WRONG_PASSWORDS) {
      const blockedUntil = meta.blockedUntil
      if (blockedUntil && Date.now() < blockedUntil) {
        const mins = Math.ceil((blockedUntil - Date.now()) / 60000)
        return c.json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` }, 429)
      }
      meta.wrongPasswordCount = 0
      delete meta.blockedUntil
    }

    if (!password) {
      return c.json({ error: 'Password is required.' }, 400)
    }

    const attempt = await hashPassword(password, meta.salt)
    if (attempt !== meta.passwordHash) {
      meta.wrongPasswordCount = (meta.wrongPasswordCount || 0) + 1
      if (meta.wrongPasswordCount >= MAX_WRONG_PASSWORDS) {
        meta.blockedUntil = Date.now() + 15 * 60 * 1000
      }
      await saveMeta(c.env, id, meta)
      const remaining = MAX_WRONG_PASSWORDS - meta.wrongPasswordCount
      return c.json({
        error: remaining > 0
          ? `Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many attempts. Blocked for 15 minutes.',
      }, 403)
    }
  }

  const fileKey = meta.fileCount > 1 ? `${id}/${fileIndex}` : id
  const object = await c.env.FILES_BUCKET.get(fileKey)
  if (!object) {
    await c.env.FILE_META.delete(id)
    return c.json({ error: 'File not found.' }, 404)
  }

  meta.downloadCount = (meta.downloadCount || 0) + 1

  if (meta.deleteAfterDownload || meta.burnAfterReading || (meta.maxDownloads > 0 && meta.downloadCount >= meta.maxDownloads)) {
    await cleanupFile(c.env, id, meta)
  } else {
    meta.wrongPasswordCount = 0
    await saveMeta(c.env, id, meta)
  }

  c.header('Content-Type', meta.files?.[fileIndex]?.type || meta.contentType || 'application/octet-stream')

  if (meta.burnAfterReading) {
    c.header('Content-Disposition', 'inline')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  } else {
    const fileName = sanitizeFilename(meta.files?.[fileIndex]?.name || meta.originalName || 'download')
    c.header('Content-Disposition', `attachment; filename="${fileName}"`)
    c.header('Cache-Control', 'no-cache')
  }

  return c.body(object.body)
})

app.get('/api/files/:id/meta', async (c) => {
  const id = c.req.param('id')

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)

  const isExpired = !meta.deleteAfterDownload && meta.expiresAt && Date.now() > meta.expiresAt
  const isDownloadLimitReached = meta.maxDownloads > 0 && meta.downloadCount >= meta.maxDownloads

  return c.json({
    originalName: meta.originalName || meta.files?.[0]?.name || 'file',
    size: meta.size || (meta.files || []).reduce((s, f) => s + f.size, 0),
    contentType: meta.contentType || meta.files?.[0]?.type || 'application/octet-stream',
    files: meta.files || [],
    fileCount: meta.fileCount || 1,
    expiresAt: meta.expiresAt || null,
    deleteAfterDownload: meta.deleteAfterDownload || false,
    burnAfterReading: meta.burnAfterReading || false,
    maxDownloads: meta.maxDownloads || 0,
    downloadCount: meta.downloadCount || 0,
    wrongPasswordCount: meta.wrongPasswordCount || 0,
    encryptionSalt: meta.encryptionSalt || null,
    expired: isExpired,
    downloadLimitReached: isDownloadLimitReached,
  })
})

app.get('/api/files/:id/preview', async (c) => {
  const id = c.req.param('id')
  const password = c.req.query('password')
  const token = c.req.query('token') || c.req.header('X-File-Token')
  const fileIndex = parseInt(c.req.query('file') || '0', 10)

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)

  if (!meta.deleteAfterDownload && meta.expiresAt && Date.now() > meta.expiresAt) {
    return c.json({ error: 'File has expired.' }, 410)
  }

  const tokenValid = token && meta.shareToken && token === meta.shareToken

  if (!tokenValid) {
    if (!password) return c.json({ error: 'Password is required.' }, 400)
    const attempt = await hashPassword(password, meta.salt)
    if (attempt !== meta.passwordHash) {
      return c.json({ error: 'Invalid password.' }, 403)
    }
  }

  const fileInfo = meta.files?.[fileIndex]
  if (!fileInfo) return c.json({ error: 'File index not found.' }, 404)

  const fileKey = meta.fileCount > 1 ? `${id}/${fileIndex}` : id
  const object = await c.env.FILES_BUCKET.get(fileKey)
  if (!object) return c.json({ error: 'File not found.' }, 404)

  if (fileInfo.size > MAX_PREVIEW_SIZE) {
    return c.json({ error: 'File too large to preview. Maximum 10 MB.' }, 400)
  }

  const buffer = await object.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunks = []
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    chunks.push(String.fromCharCode(...chunk))
  }
  const base64 = btoa(chunks.join(''))
  const dataUrl = `data:${fileInfo.type};base64,${base64}`

  return c.json({ type: fileInfo.type, name: fileInfo.name, size: fileInfo.size, dataUrl })
})

function verifyAdmin(meta, adminToken) {
  return adminToken && meta.adminToken && adminToken === meta.adminToken
}

app.get('/api/manage/:id', async (c) => {
  const id = c.req.param('id')
  const adminToken = c.req.header('X-Admin-Token')

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)
  if (!verifyAdmin(meta, adminToken)) return c.json({ error: 'Unauthorized.' }, 401)

  return c.json({
    id,
    fileCount: meta.fileCount,
    files: meta.files,
    createdAt: meta.createdAt || 0,
    expiresAt: meta.expiresAt || null,
    downloadCount: meta.downloadCount || 0,
    wrongPasswordCount: meta.wrongPasswordCount || 0,
    maxDownloads: meta.maxDownloads || 0,
    burnAfterReading: meta.burnAfterReading || false,
    deleteAfterDownload: meta.deleteAfterDownload || false,
  })
})

app.post('/api/manage/:id/delete', async (c) => {
  const id = c.req.param('id')
  const adminToken = c.req.header('X-Admin-Token')

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)
  if (!verifyAdmin(meta, adminToken)) return c.json({ error: 'Unauthorized.' }, 401)

  await cleanupFile(c.env, id, meta)
  return c.json({ deleted: true })
})

app.post('/api/manage/:id/expire', async (c) => {
  const id = c.req.param('id')
  const adminToken = c.req.header('X-Admin-Token')

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)
  if (!verifyAdmin(meta, adminToken)) return c.json({ error: 'Unauthorized.' }, 401)

  meta.expiresAt = Date.now() - 1000
  await saveMeta(c.env, id, meta)
  return c.json({ expired: true })
})

app.post('/api/manage/:id/update', async (c) => {
  const id = c.req.param('id')
  const adminToken = c.req.header('X-Admin-Token')
  const body = await c.req.json()

  const meta = await getMeta(c.env, id)
  if (!meta) return c.json({ error: 'File not found.' }, 404)
  if (!verifyAdmin(meta, adminToken)) return c.json({ error: 'Unauthorized.' }, 401)

  if (body.maxDownloads !== undefined) {
    const val = parseInt(body.maxDownloads, 10) || 0
    meta.maxDownloads = Math.max(0, val)
  }
  if (body.burnAfterReading !== undefined) {
    meta.burnAfterReading = !!body.burnAfterReading
  }
  if (body.expirationMinutes !== undefined) {
    const mins = parseInt(body.expirationMinutes, 10)
    if (mins > 0) meta.expiresAt = meta.createdAt + mins * 60 * 1000
  }

  await saveMeta(c.env, id, meta)
  return c.json({
    maxDownloads: meta.maxDownloads,
    burnAfterReading: meta.burnAfterReading,
    expiresAt: meta.expiresAt,
  })
})

async function cleanupFile(env, id, meta) {
  if (meta.fileCount > 1) {
    for (let i = 0; i < meta.fileCount; i++) {
      await env.FILES_BUCKET.delete(`${id}/${i}`)
    }
  } else {
    await env.FILES_BUCKET.delete(id)
  }
  await env.FILE_META.delete(id)
}

export default app
