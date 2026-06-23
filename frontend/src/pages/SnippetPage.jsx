import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Check, Code, Copy, Download, Mail, QrCode, Loader2, Lock, Eye, EyeOff, Sparkles, Maximize2, ShieldAlert, Clock } from 'lucide-react'
import { CopyButton } from '../components/Shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' }, { value: 'tsx', label: 'TSX' },
  { value: 'python', label: 'Python' }, { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' }, { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' }, { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Shell' }, { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' }, { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' }, { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' }, { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' }, { value: 'kotlin', label: 'Kotlin' },
  { value: 'yaml', label: 'YAML' }, { value: 'plaintext', label: 'Plain Text' },
]

const EXPIRATIONS = [
  { value: '1', label: '1 min' }, { value: '5', label: '5 min' },
  { value: '15', label: '15 min' }, { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' }, { value: '360', label: '6 hours' },
  { value: '1440', label: '24 hours' }, { value: '2880', label: '2 days' },
  { value: '10080', label: '7 days' },
]

const EXT_MAP = {
  javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx',
  python: 'py', html: 'html', css: 'css', json: 'json', markdown: 'md',
  sql: 'sql', bash: 'sh', go: 'go', rust: 'rs', java: 'java',
  cpp: 'cpp', csharp: 'cs', php: 'php', ruby: 'rb', swift: 'swift',
  kotlin: 'kt', yaml: 'yaml', plaintext: 'txt',
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pw = ''
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
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

function LineNumbers({ code }) {
  const lines = code.split('\n')
  return (
    <div
      className="select-none text-right pr-3 py-4 text-sm font-mono leading-[1.5] text-text-muted/30 shrink-0"
      style={{ minWidth: `${Math.max(String(lines.length).length, 2) * 0.75 + 1.5}rem` }}
      aria-hidden
    >
      {lines.map((_, i) => (
        <div key={i} className="hover:text-text-muted/60 transition-colors">{i + 1}</div>
      ))}
    </div>
  )
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

export default function SnippetPage() {
  const navigate = useNavigate()
  const pageLocation = useLocation()
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('')
  const [password, setPassword] = useState('')
  const [passwordProtected, setPasswordProtected] = useState(true)
  const [expiration, setExpiration] = useState('60')
  const [burnAfterReading, setBurnAfterReading] = useState(false)
  const [maxDownloads, setMaxDownloads] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const verifyRef = useRef(null)
  const onVerifyRef = useRef(null)
  const [wordWrap, setWordWrap] = useState(false)
  const [tabSize, setTabSize] = useState(2)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const editorRef = useRef(null)
  const editorWrapperRef = useRef(null)

  useEffect(() => {
    if (pageLocation.state?.code) {
      setCode(pageLocation.state.code)
      window.history.replaceState({}, '')
    }
  }, [pageLocation.state])

  const langObj = language ? LANGUAGES.find(l => l.value === language) || LANGUAGES[0] : null

  const ext = EXT_MAP[language] || 'txt'

  const shareLink = result ? `${window.location.origin}/files/${result.id}` : ''
  const shareToken = result?.shareToken || ''
  const encryptedLink = passwordProtected ? shareLink : `${shareLink}?token=${shareToken}`
  const contentSize = useMemo(() => new Blob([code]).size, [code])
  useLayoutEffect(() => {
    const ta = editorRef.current
    if (ta) {
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [code])

  useEffect(() => {
    if (result && showQr) {
      QRCode.toDataURL(encryptedLink, {
        width: 200, margin: 2,
        color: { dark: '#8b5cf6', light: '#00000000' },
      }).then(setQrDataUrl)
    }
  }, [result, showQr, encryptedLink])

  useEffect(() => {
    if (!passwordProtected && !password) setPassword(generatePassword())
  }, [passwordProtected])

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
    if (!showShortcuts) return
    function onKey(e) { if (e.key === 'Escape') setShowShortcuts(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showShortcuts])

  useEffect(() => {
    if (showShortcuts || showVerification) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showShortcuts, showVerification])

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text')
    if (!text) return
    e.preventDefault()
    const ta = editorRef.current
    if (!ta) { setCode(prev => prev + text); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    setCode(prev => prev.slice(0, start) + text + prev.slice(end))
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }, [])

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setShowShortcuts(prev => !prev)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = editorRef.current
      if (!ta) return
      const start = ta.selectionStart, end = ta.selectionEnd
      setCode(prev => prev.slice(0, start) + ' '.repeat(tabSize) + prev.slice(end))
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + tabSize
      })
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCreate()
    }
  }

  function handleExpand() {
    navigate('/editor/full', { state: { code, language } })
  }

  function handleCreate(e) {
    e?.preventDefault()
    setError('')
    if (!code.trim()) { setError('Write some code or text first.'); return }
    if (!language) { setError('Select a programming language.'); return }
    const effectivePassword = passwordProtected ? password : password || generatePassword()
    if (passwordProtected && (!effectivePassword || effectivePassword.length < 8)) {
      setError('Password must be at least 8 characters.'); return
    }
    onVerifyRef.current = async (token) => {
      setShowVerification(false)
      setUploading(true)
      try {
        const file = new File([code], `snippet.${ext}`, { type: 'text/plain' })
        const formData = new FormData()
        formData.append('file', file)
        formData.append('password', effectivePassword)
        formData.append('expiration', expiration)
        if (burnAfterReading) formData.append('burnAfterReading', 'true')
        if (maxDownloads) formData.append('maxDownloads', maxDownloads)
        if (token) formData.append('cf-turnstile-response', token)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)
        const response = await fetch('/api/upload', { method: 'POST', body: formData, signal: controller.signal })
        clearTimeout(timeout)
        if (!response.ok) {
          const text = await response.text()
          let errMsg
          try { const d = JSON.parse(text); errMsg = d.error } catch { errMsg = text ? text.slice(0, 200) : 'Unknown error' }
          throw new Error(errMsg || 'Upload failed')
        }
        const data = await response.json()
        setResult(data)
        setTimeLeft(formatTimeLeft(data.expiresAt))
        toast.success('Snippet created successfully')
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Network error.')
        else setError('Upload timed out. Please try again.')
      } finally { setUploading(false) }
    }
    setShowVerification(true)
  }

  function reset() {
    setResult(null); setCode(''); setPassword('')
    setTimeLeft(''); setShowQr(false); setQrDataUrl('')
  }

  if (result) {
    return (
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-success-bg text-success">
            <Check className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Snippet created</h3>
            <p className="text-sm text-text-muted">
              {(langObj?.label || 'Unknown')} &middot; {contentSize > 1024 ? `${(contentSize / 1024).toFixed(1)} KB` : `${contentSize} B`}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden card-hover">
          <CardContent className="p-0">
            <div className="relative max-h-64 overflow-auto bg-surface-overlay">
              <pre className="text-sm font-mono text-text-primary p-5 whitespace-pre-wrap break-all"><code>{code.slice(0, 5000)}{code.length > 5000 ? '\n\n... (truncated)' : ''}</code></pre>
            </div>

            <div className="flex flex-wrap gap-1.5 px-5 pt-3">
              {burnAfterReading && <Badge variant="warning">Burn after reading</Badge>}
              {!passwordProtected && <Badge variant="default">No password needed</Badge>}
              {passwordProtected && <Badge variant="default">Password protected</Badge>}
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Share link</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-surface border border-border-default rounded-lg px-4 py-2.5 text-sm text-text-primary font-mono truncate">
                    {encryptedLink}
                  </div>
                  <CopyButton text={encryptedLink} />
                </div>
              </div>

              {!passwordProtected && (
                <div className="p-4 bg-accent-subtle border border-accent/20 rounded-xl animate-scale-in">
                  <p className="text-sm text-text-secondary leading-relaxed">No password required. Anyone with the link can view this snippet.</p>
                </div>
              )}

              {passwordProtected && (
                <div className="p-4 bg-surface-overlay border border-border-default rounded-xl animate-scale-in space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Password</span>
                    <Button variant="link" size="sm" onClick={() => { navigator.clipboard.writeText(password); toast.success('Password copied!') }}>
                      Copy password
                    </Button>
                  </div>
                  <p className="text-sm font-mono text-text-primary break-all">{password}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(code); toast.success('Code copied!') }}>
                  <Copy className="w-3.5 h-3.5" /> Copy code
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:?subject=Code%20snippet&body=Here%20is%20a%20code%20snippet:%20${encodeURIComponent(encryptedLink)}${!passwordProtected ? '' : `%0A%0APassword:%20${encodeURIComponent(password)}`}`}>
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const blob = new Blob([code], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `snippet.${ext}`; a.click()
                  URL.revokeObjectURL(url)
                }}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowQr(!showQr)}>
                  <QrCode className="w-4 h-4" />{showQr ? 'Hide QR' : 'Show QR'}
                </Button>
              </div>

              {showQr && qrDataUrl && (
                <Card className="bg-surface border-border-default animate-scale-in">
                  <CardContent className="p-4 flex flex-col items-center gap-4">
                    <img src={qrDataUrl} alt="QR code" className="w-[180px] h-[180px]" />
                    <Button variant="outline" size="sm" onClick={() => {
                      const a = document.createElement('a')
                      a.href = qrDataUrl; a.download = `filesnaps-${result.id}.png`; a.click()
                    }}>
                      <Download className="w-3.5 h-3.5" /> Download QR
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {burnAfterReading ? 'Deletes after viewing' : ''}
                  {!burnAfterReading && result.expiresAt ? (
                    <><CountdownTimer expiresAt={result.expiresAt} /> &middot; Expires {new Date(result.expiresAt).toLocaleString()}</>
                  ) : !burnAfterReading ? 'No time limit' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="link" onClick={reset}>Create new snippet</Button>
          <span className="text-text-muted/50">&middot;</span>
          <Button variant="link" asChild>
            <Link to={`/files/${result.id}`}>View link</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1 sm:space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">Language</p>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          
          </div>
          <div className="sm:w-48 space-y-1 sm:space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">Expires in</p>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Code{langObj ? ` \u2014 ${langObj.label}` : ' \u2014 Select language'}
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-text-muted font-mono">
                {contentSize > 1024 ? `${(contentSize / 1024).toFixed(1)} KB` : `${contentSize} B`}
              </span>
              <button type="button" onClick={handleExpand}
                className="text-text-muted hover:text-text-secondary transition-colors"
                title="Open in full page editor"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="relative bg-surface-raised border border-border-default overflow-hidden focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 transition-all duration-300">
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-surface-overlay border-b border-border-default">
              <Code className="w-4 h-4 text-text-muted" />
              <span className="text-xs font-medium text-text-muted">
                {langObj?.label || 'Select language'}
              </span>
              <div className="flex-1" />
              <span className="hidden sm:inline text-[10px] text-text-muted/50">Tab indents &middot; Ctrl+Enter to create</span>
              <button type="button" onClick={() => setShowShortcuts(true)}
                className="text-[10px] text-text-muted/50 hover:text-text-muted transition-colors"
                title="Keyboard shortcuts"
              >
                ⌘K
              </button>
              <button type="button" onClick={() => setWordWrap(!wordWrap)}
                className={`text-[10px] transition-colors ${wordWrap ? 'text-accent' : 'text-text-muted/50 hover:text-text-muted'}`}
                title="Toggle word wrap"
              >
                {wordWrap ? 'Wrap' : 'No wrap'}
              </button>
            </div>

              <div ref={editorWrapperRef} className="overflow-auto max-h-[600px]">
                <div className="flex" style={{ minHeight: '280px' }}>
                  <LineNumbers code={code} />
                  <div className="flex-1 relative">
                    <textarea
                      ref={editorRef}
                      value={code} onChange={(e) => setCode(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                      placeholder="Paste or write your code here..."
                      className={`w-full bg-transparent border-0 py-4 pr-4 pl-0 text-sm font-mono text-text-primary placeholder:text-text-muted/40 resize-none overflow-hidden focus:outline-none leading-[1.5] ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <span className="relative inline-flex items-center justify-center shrink-0">
              <input type="checkbox" checked={passwordProtected} onChange={(e) => setPasswordProtected(e.target.checked)} className="sr-only peer" />
              <span className="w-5 h-5 border-2 border-border-default transition-all block peer-checked:border-accent"></span>
              <Check className="w-3 h-3 text-accent absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
            </span>
            <div>
              <span className="text-xs sm:text-sm text-text-secondary font-medium">Password protect</span>
              <p className="text-[10px] sm:text-xs text-text-muted">Recipients will need a password to view the snippet</p>
            </div>
          </label>

          {passwordProtected && (
            <div className="space-y-1 animate-fade-in">
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
              <Button type="button" variant="link" size="sm" onClick={() => setPassword(generatePassword())} className="px-0 h-auto">
                <Sparkles className="w-3 h-3" /> Generate strong password
              </Button>
            </div>
          )}

          {!passwordProtected && (
            <div className="p-3 sm:p-4 bg-surface-overlay border border-border-default animate-scale-in">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-secondary font-medium">Anyone with the link can view</p>
                  <p className="text-xs text-text-muted mt-0.5">The snippet will still be encrypted but no password prompt will appear.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
          <span className="relative inline-flex items-center justify-center shrink-0">
            <input type="checkbox" checked={burnAfterReading} onChange={(e) => setBurnAfterReading(e.target.checked)} className="sr-only peer" />
            <span className="w-5 h-5 border-2 border-border-default transition-all block peer-checked:border-orange-400"></span>
            <Check className="w-3 h-3 text-orange-400 absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
          </span>
          <div>
            <span className="text-xs sm:text-sm text-text-secondary font-medium">Burn after reading</span>
            <p className="text-[10px] sm:text-xs text-text-muted">Snippet is shown once in the browser and immediately deleted</p>
          </div>
        </label>

        {burnAfterReading && (
          <div className="p-3 sm:p-4 bg-orange-400/5 border border-orange-400/20 animate-scale-in">
            <p className="text-sm text-text-secondary leading-relaxed">The snippet will open in the browser. Cannot be saved. Deleted immediately after viewing.</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Max downloads <span className="text-text-muted/50 font-normal normal-case">(leave empty for unlimited)</span></p>
          <input type="number" min="1" step="1" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value.replace(/\D/g, ''))}
            placeholder="Unlimited"
            className="w-full bg-surface-raised border border-border-default px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-3 p-4 bg-surface-overlay border border-border-default rounded-xl animate-fade-in">
            <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
            <span className="text-sm text-text-muted font-medium">Creating snippet...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-danger-bg border border-danger-border rounded-xl animate-scale-in">
            <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger font-medium">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={uploading || !code.trim()} size="xl" className="w-full">
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating</>
          ) : (
            <><Code className="w-5 h-5" /> Create Snippet</>
          )}
        </Button>
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
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={() => setShowShortcuts(false)}>
            <div className="bg-surface-raised border border-border-default p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Save / Create</span>
                  <kbd className="px-2 py-0.5 bg-surface border border-border-default text-xs text-text-muted font-mono">Ctrl+Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Indent</span>
                  <kbd className="px-2 py-0.5 bg-surface border border-border-default text-xs text-text-muted font-mono">Tab</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Close shortcuts</span>
                  <kbd className="px-2 py-0.5 bg-surface border border-border-default text-xs text-text-muted font-mono">Esc</kbd>
                </div>
              </div>
              <button type="button" onClick={() => setShowShortcuts(false)} className="mt-4 text-xs text-accent hover:text-accent-hover font-medium">Close</button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
