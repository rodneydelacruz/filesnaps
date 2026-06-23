import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import hljs from 'highlight.js'
import { toast } from 'sonner'
import { FileIcon, formatBytes } from '../components/Shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle, Clock, Copy, Download, Eye, EyeOff, FileText, Lock, ShieldAlert } from 'lucide-react'

const PREVIEWABLE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']

const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs', 'swift', 'kt', 'php', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'toml', 'md', 'sql', 'sh', 'bash', 'txt']

function getCodeLanguage(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  if (!ext) return 'plaintext'
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', cs: 'csharp', swift: 'swift', kt: 'kotlin',
    php: 'php', html: 'html', css: 'css', scss: 'scss',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash', txt: 'plaintext',
  }
  return map[ext] || 'plaintext'
}

function improveLanguageDetection(code, detected) {
  if (detected === 'javascript' && /<[A-Z]\w+\s/.test(code)) return 'jsx'
  if (detected === 'typescript' && /<[A-Z]\w+\s/.test(code)) return 'tsx'
  return detected
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
    <div className={`flex items-center gap-2 text-sm transition-all duration-500 ${isUrgent ? 'animate-pulse-glow rounded-lg px-3 py-1.5 -mx-1' : ''}`}>
      <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-warning' : 'text-text-muted'}`} />
      <span className={isUrgent ? 'text-warning font-semibold' : 'text-text-muted'}>{remaining === 'Expired' ? 'Expired' : `${remaining} remaining`}</span>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6 max-w-lg mx-auto w-full animate-pulse">
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 sm:h-6 w-44 rounded-lg" />
          <Skeleton className="h-4 w-28 rounded-lg" />
        </div>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 sm:p-6 border-b border-border-default space-y-3">
            <Skeleton className="h-5 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="mt-6 border border-border-default rounded-2xl overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-surface-overlay border-b border-border-default">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="w-16 h-7 rounded-lg" />
          <Skeleton className="w-20 h-7 rounded-lg" />
        </div>
      </div>
      <div className="p-5 sm:p-6 space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className={`h-4 rounded-lg ${i === 7 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

function CodePreview({ content, fileName }) {
  return (
    <div className="mt-4 sm:mt-6 border border-border-default overflow-hidden animate-scale-in shadow-sm card-hover">
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-surface-overlay border-b border-border-default">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted shrink-0" />
          <span className="text-[10px] sm:text-xs font-medium text-text-muted">{content.language}</span>
          <span className="text-[10px] sm:text-xs text-text-muted/50">&middot;</span>
          <span className="text-[10px] sm:text-xs text-text-muted truncate">{formatBytes(new Blob([content.text]).size)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-1.5 sm:px-2.5" onClick={() => { navigator.clipboard.writeText(content.text); toast.success('Code copied!') }}>
            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Copy
          </Button>
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8 px-1.5 sm:px-2.5" onClick={() => {
            const blob = new Blob([content.text], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = fileName; a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Download
          </Button>
        </div>
      </div>
      <div className="relative max-h-[500px] overflow-auto bg-surface-overlay">
        <div className="flex">
          <div className="select-none text-right pl-5 pr-3 py-4 text-xs font-mono leading-relaxed text-text-muted/20 shrink-0">
            {content.text.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="p-5 sm:p-6 text-sm leading-relaxed pl-3"><code className={`hljs language-${content.language}`} dangerouslySetInnerHTML={{ __html: content.html }} /></pre>
        </div>
      </div>
    </div>
  )
}

export default function DownloadPage() {
  const { id } = useParams()
  const [password, setPassword] = useState('')
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState('')
  const [metaError, setMetaError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedFile, setSelectedFile] = useState(0)
  const [hasToken, setHasToken] = useState(false)
  const [content, setContent] = useState(null)
  const [burned, setBurned] = useState(false)
  const shareTokenRef = useRef('')
  const audioRef = useRef(null)

  const currentFile = meta?.files?.[selectedFile] || { name: meta?.originalName || 'file', size: meta?.size || 0, type: meta?.contentType || 'application/octet-stream' }
  const isCodeFile = useMemo(() => {
    const ext = currentFile.name?.split('.').pop()?.toLowerCase()
    return CODE_EXTENSIONS.includes(ext) || currentFile.type?.startsWith('text/')
  }, [currentFile])
  const codeLanguage = useMemo(() => getCodeLanguage(currentFile.name), [currentFile.name])

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token')
    const storedToken = sessionStorage.getItem(`filesnaps_token_${id}`)
    const token = urlToken || storedToken
    if (token) {
      shareTokenRef.current = token
      setHasToken(true)
      sessionStorage.setItem(`filesnaps_token_${id}`, token)
      if (urlToken) window.history.replaceState(null, '', `/files/${id}`)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/files/${id}/meta`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) setMetaError(data.error || 'File not found.')
        else if (data.expired) setMetaError('This file has expired.')
        else if (data.downloadLimitReached) setMetaError('Download limit has been reached.')
        else setMeta(data)
      } catch { if (!cancelled) setMetaError('Unable to connect to server.') }
      finally { if (!cancelled) setLoading(false) }
    }
    fetchMeta()
    return () => { cancelled = true }
  }, [id])

  function authParams() {
    if (shareTokenRef.current) return `token=${encodeURIComponent(shareTokenRef.current)}`
    return `password=${encodeURIComponent(password)}`
  }

  async function loadContent(fileIdx) {
    setLoadingContent(true); setError('')
    try {
      const res = await fetch(`/api/files/${id}/preview?file=${fileIdx || 0}&${authParams()}`)
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Failed to load content.'); setLoadingContent(false); return }
      const data = await res.json()
      if (isCodeFile) {
        const base64 = data.dataUrl.split(',')[1]
        const text = atob(base64)
        const baseLang = codeLanguage !== 'plaintext' ? codeLanguage : hljs.highlightAuto(text).language || 'plaintext'
        const improvedLang = improveLanguageDetection(text, baseLang)
        let result
        if (improvedLang !== 'plaintext') result = hljs.highlight(text, { language: improvedLang, ignoreIllegals: true })
        else result = hljs.highlightAuto(text)
        setContent({ type: 'code', text, html: result.value, language: improvedLang, name: data.name })
      } else if (PREVIEWABLE_TYPES.includes(currentFile.type)) {
        setContent({ type: 'preview', dataUrl: data.dataUrl, name: data.name, mimeType: data.type })
      } else {
        setContent({ type: 'other', name: data.name })
      }
      if (meta?.burnAfterReading) { fetch(`/api/files/${id}?file=${fileIdx || 0}&${authParams()}`).catch(() => {}); setBurned(true) }
    } catch { setError('Network error.') }
    finally { setLoadingContent(false) }
  }

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault(); setError('')
    if (meta?.burnAfterReading || isCodeFile) { await loadContent(selectedFile); return }
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/files/${id}?file=${selectedFile || 0}&${authParams()}`)
      if (!res.ok) { const data = await res.json(); setError(data.error || 'Download failed.'); setLoadingContent(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = meta?.files?.[selectedFile]?.name || meta?.originalName || 'download'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLoadingContent(false)
    } catch { setError('Network error.'); setLoadingContent(false) }
  }, [id, password, meta, selectedFile, isCodeFile])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  if (metaError) {
    return (
      <div className="min-h-screen bg-surface flex flex-col animate-fade-in">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            <span className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-danger-bg">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-danger" />
            </span>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary">Not found</h1>
              <p className="text-sm text-text-muted leading-relaxed">{metaError}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
              <Button variant="default" size="sm" onClick={() => window.location.href = '/'}>
                Go home
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-6 border-t border-border-default/50">
          <Link to="/" className="text-xs text-text-muted/40 hover:text-text-muted transition-colors flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> FileSnaps
          </Link>
        </div>
      </div>
    )
  }

  const isBurned = meta?.burnAfterReading
  const remaining = meta?.maxDownloads ? meta.maxDownloads - meta.downloadCount : null
  const isLocked = meta?.wrongPasswordCount >= 5 && !hasToken

  return (
    <div className="min-h-screen bg-surface flex flex-col animate-fade-in">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {burned && (
          <div className="p-3 sm:p-5 bg-orange-400/5 border border-orange-400/20 mb-4 sm:mb-8 animate-scale-in">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-400">Burn after reading</p>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">This content has been viewed and is now permanently deleted. Refreshing or revisiting this link will not show it again.</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-surface-raised border border-border-default rounded-2xl overflow-hidden shadow-sm card-hover">
          <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 border-b border-border-default">
            <span className="text-accent mt-0.5 shrink-0"><FileIcon name={currentFile.name} className="w-10 h-10 sm:w-12 sm:h-12" /></span>
            <div className="min-w-0 flex-1">
              {meta?.fileCount > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {meta.files.map((f, i) => (
                    <button key={i} onClick={() => { setSelectedFile(i); setContent(null); setBurned(false) }}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${i === selectedFile ? 'bg-accent text-white shadow-sm' : 'bg-surface-overlay text-text-muted hover:text-text-secondary'}`}
                    >File {i + 1}</button>
                  ))}
                </div>
              )}
              <p className="text-sm sm:text-base font-semibold text-text-primary truncate">{currentFile.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="text-xs sm:text-sm text-text-muted">{formatBytes(currentFile.size)}</span>
                {isCodeFile && <Badge variant="default">{codeLanguage}</Badge>}
                {isBurned && <Badge variant="warning">Burn after reading</Badge>}
                {remaining !== null && <Badge variant="secondary">{remaining} download{remaining !== 1 ? 's' : ''} left</Badge>}
              </div>
            </div>
          </div>
          {meta?.expiresAt && !burned && (
            <div className="px-4 sm:px-5 py-3 border-b border-border-default bg-surface-overlay/30">
              <CountdownTimer expiresAt={meta.expiresAt} />
            </div>
          )}
        </div>

        {content?.type === 'code' && content.html && (
          <CodePreview content={content} fileName={currentFile.name} />
        )}

        {content?.type === 'preview' && (
          <div className="mt-6 border border-border-default rounded-2xl overflow-hidden animate-scale-in shadow-sm">
            {currentFile.type.startsWith('image/') && <img src={content.dataUrl} alt={currentFile.name} className="w-full max-h-[500px] object-contain bg-surface-overlay" />}
            {currentFile.type.startsWith('video/') && <video controls className="w-full max-h-[500px] bg-surface-overlay" src={content.dataUrl} />}
            {currentFile.type === 'application/pdf' && <iframe title="PDF preview" src={content.dataUrl} className="w-full h-[550px] border-0" />}
            {currentFile.type.startsWith('audio/') && (
              <div className="p-4 sm:p-8">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1"><p className="text-xs sm:text-sm font-semibold text-text-primary truncate">{currentFile.name}</p><p className="text-[10px] sm:text-xs text-text-muted">{currentFile.type.replace('audio/', '.').toUpperCase()}</p></div>
                </div>
                <audio ref={audioRef} controls className="w-full" src={content.dataUrl} />
              </div>
            )}
          </div>
        )}

        {isLocked && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-5 bg-danger-bg border border-danger-border animate-scale-in">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger font-medium">Too many wrong attempts. This file is blocked for 15 minutes.</p>
            </div>
          </div>
        )}

          {!content && !isLocked && (
          <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-4 sm:space-y-5">
            {!hasToken && (
              <div className="space-y-2">
                <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">Password</p>
                <div>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter the file password"
                      className="w-full bg-surface-raised border border-border-default px-3.5 py-2.5 pr-11 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary transition-colors hover:bg-surface-hover" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>
            </div>
            )}

            {hasToken && (
              <div className="p-3 sm:p-5 bg-accent-subtle border border-accent/20 animate-scale-in">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">Password is already provided with this link. No need to enter it manually.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-3 sm:p-5 bg-danger-bg border border-danger-border animate-scale-in">
                <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger font-medium">{error}</p>
              </div>
            )}

            {loadingContent && (
              <div className="animate-fade-in">
                {isCodeFile ? <ContentSkeleton /> : (
                  <div className="flex items-center justify-center gap-3 py-12 animate-fade-in">
                    <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-text-muted font-medium">
                      {isBurned ? 'Opening file...' : 'Downloading...'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {!loadingContent && (
              <Button type="submit" disabled={!hasToken && !password} size="xl" className="w-full">
                {isBurned ? <><Eye className="w-5 h-5" />Open File</>
                  : isCodeFile ? <><FileText className="w-5 h-5" />View Code</>
                  : <><Download className="w-5 h-5" />Download File</>}
              </Button>
            )}
          </form>
        )}

      </div>

      <div className="flex items-center justify-center py-6 border-t border-border-default/50">
        <Link to="/" className="text-xs text-text-muted/40 hover:text-text-muted transition-colors flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> FileSnaps
        </Link>
      </div>
    </div>
  )
}
