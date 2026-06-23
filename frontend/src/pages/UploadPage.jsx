import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Upload, X, Check, Clock, Download, Mail, QrCode, Lock, ChevronRight, ShieldAlert, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react'
import { FileIcon, CopyButton, formatBytes, useKeyboardSubmit } from '../components/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EXPIRATIONS = [
  { value: '1', label: '1 min', desc: 'Quick share' },
  { value: '5', label: '5 min', desc: 'Very short' },
  { value: '15', label: '15 min', desc: 'Short chat' },
  { value: '30', label: '30 min', desc: 'Meeting' },
  { value: '60', label: '1 hour', desc: 'Standard' },
  { value: '360', label: '6 hours', desc: 'Extended' },
  { value: '1440', label: '24 hours', desc: 'Overnight' },
  { value: '2880', label: '2 days', desc: 'Weekend' },
  { value: '10080', label: '7 days', desc: 'Long term' },
]

function formatETA(seconds) {
  if (!seconds || !isFinite(seconds)) return ''
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60), s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatTimeLeft(expiresAt) {
  if (!expiresAt) return ''
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3600000), mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`
  if (hours > 0) return `${hours}h ${mins}m remaining`
  if (mins > 0) return `${mins}m remaining`
  return `${Math.floor(diff / 1000)}s remaining`
}

function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    if (!expiresAt) { setRemaining(''); return }
    function tick() {
      const diff = expiresAt - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
      if (h > 24) setRemaining(`${Math.floor(h / 24)}d ${h % 24}h`)
      else if (h > 0) setRemaining(`${h}h ${m}m`)
      else if (m > 0) setRemaining(`${m}m ${s}s`)
      else setRemaining(`${s}s`)
    }
    tick(); const int = setInterval(tick, 1000); return () => clearInterval(int)
  }, [expiresAt])
  if (!expiresAt) return null
  const isUrgent = expiresAt - Date.now() < 3600000
  return (
    <span className={isUrgent ? 'text-warning font-semibold' : ''}>{remaining === 'Expired' ? 'Expired' : `${remaining} remaining`}</span>
  )
}

export default function UploadPage() {
  const [files, setFiles] = useState([])
  const [password, setPassword] = useState('')
  const [expiration, setExpiration] = useState('60')
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false)
  const [burnAfterReading, setBurnAfterReading] = useState(false)
  const [maxDownloads, setMaxDownloads] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [etaText, setEtaText] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [showVerification, setShowVerification] = useState(false)
  const verifyRef = useRef(null)
  const onVerifyRef = useRef(null)
  const fileInputRef = useRef(null)
  const uploadStartRef = useRef(0)
  const slugTimer = useRef(null)
  const filesRef = useRef(files)
  filesRef.current = files

  const shareLink = result ? `${window.location.origin}/files/${result.id}` : ''
  const shareToken = result?.shareToken || ''
  const encryptedLink = result ? `${shareLink}?token=${shareToken}` : ''
  const totalSize = files.reduce((s, f) => s + f.size, 0)

  useEffect(() => {
    if (!customSlug || customSlug.length < 3) { setSlugAvailable(null); return }
    clearTimeout(slugTimer.current)
    slugTimer.current = setTimeout(async () => {
      setSlugChecking(true)
      try {
        const res = await fetch(`/api/check-slug/${encodeURIComponent(customSlug)}`)
        const data = await res.json()
        setSlugAvailable(data.available)
      } catch { setSlugAvailable(null) }
      setSlugChecking(false)
    }, 400)
    return () => clearTimeout(slugTimer.current)
  }, [customSlug])

  useEffect(() => {
    if (result && showQr) {
      QRCode.toDataURL(shareLink, { width: 200, margin: 2, color: { dark: '#8b5cf6', light: '#00000000' } }).then(setQrDataUrl)
    }
  }, [result, showQr, shareLink])

  useEffect(() => {
    if (!showVerification) return
    let widgetId = null
    const timer = setTimeout(() => {
      if (verifyRef.current && typeof turnstile !== 'undefined') {
        widgetId = turnstile.render(verifyRef.current, {
          sitekey: '0x4AAAAAADpr8vVszkhuCcQG',
          theme: 'dark',
          callback: (token) => {
            if (onVerifyRef.current) {
              onVerifyRef.current(token)
            }
          },
          'expired-callback': () => {},
        })
      }
    }, 100)
    return () => {
      clearTimeout(timer)
      if (widgetId != null && typeof turnstile !== 'undefined') {
        turnstile.remove(widgetId)
      }
    }
  }, [showVerification])

  useEffect(() => {
    if (showVerification) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showVerification])

  function validateAndAddFiles(newFiles) {
    const MAX_TOTAL = 100 * 1024 * 1024
    const existingTotal = filesRef.current.reduce((s, f) => s + f.size, 0)
    const valid = []
    for (const f of newFiles) {
      const runningTotal = existingTotal + valid.reduce((s, vf) => s + vf.size, 0) + f.size
      if (runningTotal > MAX_TOTAL) {
        toast.error(`Total would exceed 100 MB limit (${formatBytes(runningTotal)} / ${formatBytes(MAX_TOTAL)})`)
        continue
      }
      valid.push(f)
    }
    if (valid.length) { setFiles(prev => [...prev, ...valid]); setError('') }
  }

  const handleFileInput = useCallback((e) => {
    if (e.target.files.length) validateAndAddFiles(Array.from(e.target.files))
    e.target.value = ''
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files.length) validateAndAddFiles(Array.from(e.dataTransfer.files))
  }, [])

  useEffect(() => {
    function handlePaste(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const items = e.clipboardData?.items
      if (!items) return
      const imageItems = [], fileItems = []
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file?.type?.startsWith('image/')) imageItems.push(file)
          else if (file) fileItems.push(file)
        }
      }
      if (imageItems.length) {
        imageItems.forEach(f => {
          const d = new Date()
          const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`
          validateAndAddFiles([new File([f], `clipboard_${ts}.png`, { type: f.type || 'image/png' })])
        })
        toast.success(`${imageItems.length} image${imageItems.length > 1 ? 's' : ''} pasted from clipboard`)
      }
      if (fileItems.length) validateAndAddFiles(fileItems)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function moveFile(from, to) {
    if (to < 0 || to >= files.length) return
    setFiles(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleKeySubmit = useKeyboardSubmit(handleUpload)

  function handleUpload(e) {
    e?.preventDefault()
    setError('')
    if (!files.length) { setError('Select at least one file.'); return }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return }
    onVerifyRef.current = async (token) => {
      setShowVerification(false)
      setUploading(true); setProgress(0)
      uploadStartRef.current = Date.now()
      try {
        const formData = new FormData()
        for (const f of files) formData.append('file', f)
        formData.append('password', password); formData.append('expiration', expiration)
        if (deleteAfterDownload) formData.append('deleteAfterDownload', 'true')
        if (burnAfterReading) formData.append('burnAfterReading', 'true')
        if (maxDownloads) formData.append('maxDownloads', maxDownloads)
        if (customSlug) formData.append('customSlug', customSlug)
        if (token) formData.append('cf-turnstile-response', token)
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setProgress(pct)
            const elapsed = (Date.now() - uploadStartRef.current) / 1000
            if (elapsed > 0.5) {
              const rate = e.loaded / elapsed
              const remaining = (e.total - e.loaded) / rate
              setEtaText(formatETA(remaining))
            }
          }
        })
        const result = await new Promise((resolve, reject) => {
          xhr.open('POST', '/api/upload')
          xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error('Invalid response')) } }
          xhr.onerror = () => reject(new Error('Network error'))
          xhr.onabort = () => reject(new Error('Upload cancelled'))
          xhr.send(formData)
        })
        if (xhr.status !== 200) { setError(result.error || 'Upload failed.'); return }
        setResult(result)
        setTimeLeft(formatTimeLeft(result.expiresAt))
        toast.success('Files uploaded successfully')
      } catch (err) {
        if (err.message !== 'Upload cancelled') setError(err.message || 'Network error.')
      } finally { setUploading(false); setEtaText('') }
    }
    setShowVerification(true)
  }

  function reset() {
    setResult(null); setFiles([]); setPassword(''); setProgress(0)
    setTimeLeft(''); setShowQr(false); setQrDataUrl(''); setEtaText('')
  }

  if (result) {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-success-bg text-success">
            <Check className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Uploaded successfully</h3>
            <p className="text-sm text-text-muted">{result.fileCount} file{result.fileCount !== 1 ? 's' : ''} &middot; {formatBytes(totalSize)}</p>
          </div>
        </div>

        <Card className="overflow-hidden card-hover">
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 border-b border-border-default space-y-2 max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-accent shrink-0"><FileIcon name={f.name} className="w-7 h-7 sm:w-8 sm:h-8" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{f.name}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted">{formatBytes(f.size)}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {result.burnAfterReading && <Badge variant="warning">Burn after reading</Badge>}
                {result.maxDownloads > 0 && <Badge variant="default">{result.maxDownloads} downloads</Badge>}
                {result.deleteAfterDownload && <Badge variant="default">1 download</Badge>}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 sm:mb-2">Share link</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-surface border border-border-default px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-text-primary font-mono truncate">{shareLink}</div>
                  <CopyButton text={shareLink} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3" onClick={() => { navigator.clipboard.writeText(encryptedLink); toast.success('Encrypted link copied!') }}>
                  <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Copy encrypted link
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3" asChild>
                  <a href={`mailto:?subject=File%20for%20you&body=Here%20is%20a%20file:%20${encodeURIComponent(shareLink)}%0A%0APassword:%20${encodeURIComponent(password)}`}>
                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Email
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowQr(!showQr)}>
                  <QrCode className="w-3.5 h-3.5" />{showQr ? 'Hide QR' : 'Show QR'}
                </Button>
              </div>

              {showQr && qrDataUrl && (
                <Card className="bg-surface border-border-default animate-scale-in">
                  <CardContent className="p-4 flex flex-col items-center gap-4">
                    <img src={qrDataUrl} alt="QR code" className="w-[180px] h-[180px]" />
                    <Button variant="outline" size="sm" onClick={() => {
                      const a = document.createElement('a'); a.href = qrDataUrl; a.download = `filesnaps-${result.id}.png`; a.click()
                    }}><Download className="w-3.5 h-3.5" /> Download QR</Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {result.deleteAfterDownload || result.burnAfterReading ? 'Deletes after download' : ''}
                  {!result.deleteAfterDownload && !result.burnAfterReading && result.expiresAt ? (
                    <><CountdownTimer expiresAt={result.expiresAt} /> &middot; Expires {new Date(result.expiresAt).toLocaleString()}</>
                  ) : !result.deleteAfterDownload && !result.burnAfterReading ? 'No time limit' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <Button variant="link" size="sm" onClick={reset}>Share more files</Button>
          <span className="hidden sm:inline text-text-muted/50">&middot;</span>
          <Button variant="link" size="sm" asChild>
            <Link to={`/files/${result.id}`}>View link</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleUpload} onKeyDown={handleKeySubmit} className="space-y-6">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative block p-5 sm:p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden
            ${dragOver ? 'gradient-border-animated glow-accent' : ''}
            ${files.length ? 'border-2 border-accent/25 bg-accent-subtle/30' : 'border-2 border-dashed border-border-default hover:border-accent/40 hover:bg-surface-hover/50'}
          `}
        >
          {dragOver && (
            <div className="absolute inset-0 bg-accent/5 animate-fade-in pointer-events-none" />
          )}
          <input ref={fileInputRef} type="file" multiple onChange={handleFileInput} className="hidden" />

          {files.length > 0 ? (
            <div className="space-y-4 relative z-10">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} 
                    draggable={!uploading}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => { e.preventDefault(); setDragIndex(i) }}
                    onDragEnd={() => setDragIndex(null)}
                    onDrop={() => { if (dragIndex !== null && dragIndex !== i) { moveFile(dragIndex, i); setDragIndex(null) } }}
                    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-surface border border-border-default text-left group/item hover:border-accent/20 hover:bg-surface-hover transition-all ${dragIndex === i ? 'opacity-50' : ''}`}
                  >
                    {f.type?.startsWith('image/') ? (
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-8 h-8 sm:w-10 sm:h-10 object-cover shrink-0" />
                    ) : (
                      <span className="text-accent shrink-0"><FileIcon name={f.name} className="w-7 h-7 sm:w-8 sm:h-8" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{f.name}</p>
                      <p className="text-[10px] sm:text-xs text-text-muted">{formatBytes(f.size)}</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="text-text-muted hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger-bg opacity-0 group-hover/item:opacity-100" aria-label="Remove file">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-text-muted px-1">
                <span>{files.length} file{files.length !== 1 ? 's' : ''} &middot; {formatBytes(totalSize)}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} className="text-accent hover:text-accent-hover font-medium transition-colors">
                  + Add more
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-surface-overlay">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-text-muted" />
              </div>
              <div>
                <p className="text-sm sm:text-base text-text-secondary">
                  <span className="text-accent font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs sm:text-sm text-text-muted mt-1.5 sm:mt-2">Any file type, up to 100 MB total. Paste images from clipboard.</p>
              </div>
            </div>
          )}
        </label>

        {uploading && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted font-medium">
                <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                Uploading{progress > 0 ? ` \u2014 ${progress}%` : '...'}
              </span>
              <span className="text-text-muted">
                {etaText && <>{etaText} remaining &middot; </>}
                {formatBytes(totalSize * (progress / 100))} / {formatBytes(totalSize)}
              </span>
            </div>
            <div className="relative">
              <Progress value={progress || 2} className="h-2" />
              {progress > 0 && progress < 100 && (
                <div className="absolute inset-0 rounded-full bg-accent/10 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a password (min 8 characters)"
              className="w-full bg-surface-raised border border-border-default px-3.5 py-2.5 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 text-text-muted hover:text-text-secondary transition-colors rounded" tabIndex={-1}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-start">
            <button type="button" onClick={() => {
              const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
              let pw = ''
              for (let i = 0; i < 20; i++) pw += chars[Math.floor(Math.random() * chars.length)]
              setPassword(pw)
            }} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors">
              <Sparkles className="w-3 h-3" /> Generate strong password
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires in</p>
          {!deleteAfterDownload && (
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 animate-fade-in">
              {EXPIRATIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setExpiration(opt.value)}
                  className={`text-left px-3 py-3 border transition-all duration-200 text-sm card-hover ${expiration === opt.value ? 'border-accent bg-accent-subtle text-accent shadow-sm' : 'border-border-default bg-surface-raised text-text-secondary hover:border-border-hover hover:bg-surface-hover'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs sm:text-sm">{opt.label}</span>
                    {expiration === opt.value && <Check className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={2.5} />}
                  </div>
                  <div className={`mt-0.5 text-[10px] sm:text-xs ${expiration === opt.value ? 'text-accent/70' : 'text-text-muted'}`}>{opt.desc}</div>
                </button>
              ))}
            </div>
          )}
          {deleteAfterDownload && (
            <div className="p-4 bg-accent-subtle border border-accent/20">
              <p className="text-sm text-text-secondary leading-relaxed">The file will be permanently deleted after the first successful download.</p>
            </div>
          )}
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className="text-text-muted">
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
          Advanced options
        </Button>

        {showAdvanced && (
          <Card className="animate-slide-down card-hover">
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Custom link code</p>
                <div className="relative">
                  <input type="text" value={customSlug} onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="e.g. my-file"
                    className="w-full bg-surface border border-border-default px-3.5 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                  {slugChecking && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-text-muted" /></span>}
                  {!slugChecking && slugAvailable === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success"><Check className="w-4 h-4" strokeWidth={2.5} /></span>}
                  {!slugChecking && slugAvailable === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-danger"><X className="w-4 h-4" strokeWidth={2.5} /></span>}
                </div>
                {slugAvailable === false && <p className="text-xs text-danger font-medium mt-1">Already taken</p>}
                {slugAvailable === true && <p className="text-xs text-success font-medium mt-1">Available</p>}
              </div>

              <div className="flex flex-wrap gap-3">
                <label className={`inline-flex items-center gap-2 text-sm font-medium transition-all px-3 py-2 border cursor-pointer ${deleteAfterDownload ? 'text-accent border-accent/30 bg-accent-subtle' : 'text-text-muted hover:text-text-secondary border-transparent hover:bg-surface-hover'}`}>
                  <span className="relative inline-flex items-center justify-center shrink-0">
                    <input type="checkbox" checked={deleteAfterDownload} onChange={() => setDeleteAfterDownload(!deleteAfterDownload)} className="sr-only peer" />
                    <span className="w-4 h-4 border-2 border-border-default transition-all block peer-checked:border-accent"></span>
                    <Check className="w-2.5 h-2.5 text-accent absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                  </span>
                  1 download
                </label>
                <label className={`inline-flex items-center gap-2 text-sm font-medium transition-all px-3 py-2 border cursor-pointer ${burnAfterReading ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' : 'text-text-muted hover:text-text-secondary border-transparent hover:bg-surface-hover'}`}>
                  <span className="relative inline-flex items-center justify-center shrink-0">
                    <input type="checkbox" checked={burnAfterReading} onChange={() => setBurnAfterReading(!burnAfterReading)} className="sr-only peer" />
                    <span className="w-4 h-4 border-2 border-border-default transition-all block peer-checked:border-orange-400"></span>
                    <Check className="w-2.5 h-2.5 text-orange-400 absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                  </span>
                  Burn after reading
                </label>
              </div>

              {burnAfterReading && (
                <div className="p-4 bg-orange-400/5 border border-orange-400/20">
                  <p className="text-sm text-text-secondary leading-relaxed">File opens in the browser. No download. Cannot be saved. Deleted immediately after viewing.</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Max downloads <span className="text-text-muted/50 font-normal normal-case">(leave empty for unlimited)</span></p>
                <input type="number" min="1" step="1" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value.replace(/\D/g, ''))}
                  placeholder="Unlimited"
                  className="w-full bg-surface-raised border border-border-default px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={() => setShowVerification(false)}>
            <div className="bg-surface-raised border border-border-default p-8 w-full max-w-sm mx-4 animate-scale-in flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-text-primary">One more step</h3>
                <p className="text-sm text-text-muted">Complete the security check</p>
              </div>
              <div ref={verifyRef}></div>
              <button type="button" onClick={() => setShowVerification(false)} className="text-xs text-text-muted hover:text-text-secondary font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-danger-bg border border-danger-border rounded-xl animate-scale-in">
            <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger font-medium">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={uploading || files.length === 0} size="xl" className="w-full">
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Uploading</>
          ) : (
            <><Upload className="w-5 h-5" /> Upload File</>
          )}
        </Button>
      </form>
    </div>
  )
}
