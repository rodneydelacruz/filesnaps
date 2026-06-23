/* eslint-disable react-refresh/only-export-components */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Copy, Eye, EyeOff, Search, X, History, FileCode, FileUp, Link } from 'lucide-react'

export function useKeyboardSubmit(onSubmit) {
  return useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSubmit(e)
    }
  }, [onSubmit])
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TYPE_GROUPS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff'],
  pdf: ['pdf'],
  video: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
  code: ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'cs', 'swift', 'kt', 'php', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'toml', 'md', 'sql', 'sh', 'bash'],
  spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
  presentation: ['ppt', 'pptx', 'odp'],
}

export function getFileType(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (!ext) return 'generic'
  for (const [type, exts] of Object.entries(TYPE_GROUPS)) {
    if (exts.includes(ext)) return type
  }
  return 'generic'
}

export function FileIcon({ name, className = 'w-10 h-10' }) {
  const type = getFileType(name)
  const cls = `${className} shrink-0`

  switch (type) {
    case 'image':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
    case 'pdf':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
    case 'video':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
    case 'audio':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" /></svg>
    case 'archive':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
    case 'code':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
    case 'spreadsheet':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25a1.125 1.125 0 0 0 1.125-1.125V5.625a1.125 1.125 0 0 0-1.125-1.125H3.375A1.125 1.125 0 0 0 2.25 5.625v12.75a1.125 1.125 0 0 0 1.125 1.125ZM8.25 8.25h.008v.008h-.008V8.25ZM11.625 8.25h.008v.008h-.008V8.25ZM15 8.25h.008v.008H15V8.25ZM8.25 11.625h.008v.008h-.008v-.008ZM11.625 11.625h.008v.008h-.008v-.008ZM15 11.625h.008v.008H15v-.008ZM8.25 15h.008v.008h-.008V15ZM11.625 15h.008v.008h-.008V15ZM15 15h.008v.008H15V15Z" /></svg>
    case 'presentation':
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>
    default:
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
  }
}

export function PasswordStrength({ password }) {
  if (!password) return null

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Very weak', color: 'bg-red-500', textColor: 'text-red-400' },
    { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-400' },
    { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    { label: 'Good', color: 'bg-lime-500', textColor: 'text-lime-400' },
    { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400' },
  ]

  const lvl = levels[Math.min(score, levels.length - 1)]

  return (
    <div className="mt-2 animate-fade-in">
      <div className="flex gap-1 h-1.5 mb-1.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${i < score ? lvl.color : 'bg-border-default'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${lvl.textColor}`}>{lvl.label}</p>
    </div>
  )
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'} size="sm">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="p-1.5 text-text-muted hover:text-text-secondary transition-colors rounded-md hover:bg-surface-hover"
      tabIndex={-1}
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )
}

const RECENTS_KEY = 'filesnaps_recents'
const MAX_RECENTS = 10

export function useRecentUploads() {
  const [recents, setRecents] = useState([])

  const loadRecents = useCallback(() => {
    try {
      return JSON.parse(sessionStorage.getItem(RECENTS_KEY)) || []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    setRecents(loadRecents())
    const handler = () => setRecents(loadRecents())
    window.addEventListener('recents-updated', handler)
    return () => window.removeEventListener('recents-updated', handler)
  }, [loadRecents])

  const addRecent = useCallback((item) => {
    setRecents(prev => {
      const filtered = prev.filter(r => r.id !== item.id)
      const next = [{ ...item, createdAt: Date.now() }, ...filtered].slice(0, MAX_RECENTS)
      try { sessionStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch {}
      window.dispatchEvent(new CustomEvent('recents-updated'))
      return next
    })
  }, [])

  const removeRecent = useCallback((id) => {
    setRecents(prev => {
      const next = prev.filter(r => r.id !== id)
      try { sessionStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch {}
      window.dispatchEvent(new CustomEvent('recents-updated'))
      return next
    })
  }, [])

  return { recents, addRecent, removeRecent }
}

export function RecentSection({ recents, onReset }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!recents.length) return null

  function copyLink(r) {
    const base = `${window.location.origin}/files/${r.id}`
    let url = base
    if (r.shareToken) {
      url += `?token=${r.shareToken}`
      if (r.encryptionSalt) url += `&key=${encodeURIComponent(r.password || '')}`
    }
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  return (
    <div className="mt-8 pt-6 border-t border-border-default animate-slide-up">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 hover:text-text-secondary transition-colors"
      >
        <History className="w-3.5 h-3.5" />
        Recent
        <span className="text-text-muted/50 font-normal normal-case">({recents.length})</span>
        <svg className={`w-3 h-3 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && (
        <div className="space-y-1.5">
          {recents.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border-default hover:border-border-hover transition-all">
              <span className="text-accent shrink-0">
                {r.type === 'snippet' ? <FileCode className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-primary truncate">{r.name || 'Untitled'}</p>
                <p className="text-[10px] text-text-muted">{r.type === 'snippet' ? 'Snippet' : 'File'} &middot; {new Date(r.createdAt).toLocaleTimeString()}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => copyLink(r)} title="Copy link">
                <Link className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptFile(file, password, salt) {
  const fileBytes = await file.arrayBuffer()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBytes)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return new Blob([combined], { type: file.type || 'application/octet-stream' })
}

export async function decryptFile(encryptedBlob, password, salt) {
  const encryptedBytes = await encryptedBlob.arrayBuffer()
  const iv = new Uint8Array(encryptedBytes.slice(0, 12))
  const ciphertext = encryptedBytes.slice(12)
  const key = await deriveKey(password, salt)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

export function SearchableSelect({ options, value, onValueChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, search])

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between whitespace-nowrap border border-border-default bg-surface-raised px-3.5 py-2 text-sm text-text-primary shadow-sm transition-all duration-200 hover:border-border-hover focus-visible:outline-none focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/15"
      >
        <span className={selected ? '' : 'text-text-muted'}>{selected?.label || placeholder || 'Select...'}</span>
        <svg className="h-4 w-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-border-default bg-surface-raised text-text-primary shadow-2xl shadow-black/30 animate-scale-in overflow-hidden">
          <div className="p-2 border-b border-border-default">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-surface border border-border-default pl-8 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">No results found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onValueChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center rounded-lg py-2.5 pl-3 pr-8 text-sm text-left transition-colors hover:bg-surface-hover ${value === opt.value ? 'bg-accent-subtle text-accent' : 'text-text-primary'}`}
                >
                  {opt.label}
                  {value === opt.value && (
                    <span className="ml-auto">
                      <Check className="h-4 w-4 text-accent" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FloatingLabelInput({ label, id, error, type, ...props }) {
  const [visible, setVisible] = useState(type === 'password' ? false : null)
  const [focused, setFocused] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="relative group transition-all duration-300">
      <input
        id={id}
        type={isPassword && visible ? 'text' : type}
        placeholder=" "
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`
          peer w-full h-11 border border-border-default bg-surface-raised px-3.5 pt-3.5 pb-1
          text-sm text-text-primary placeholder:text-transparent
          transition-all duration-300
          focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'hover:border-border-hover'}
          ${isPassword ? 'pr-10' : 'pr-3.5'}
        `}
        {...props}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-4 transition-all duration-300 pointer-events-none select-none
          ${focused || props.value ? 'top-1 text-xs' : 'top-3 text-sm'}
          ${focused ? 'text-accent' : error ? 'text-danger' : 'text-text-muted'}
        `}
      >
        {label}
      </label>
      {isPassword && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <PasswordToggle visible={visible} onToggle={() => setVisible(!visible)} />
        </div>
      )}
    </div>
  )
}
