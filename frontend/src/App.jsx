import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { Sun, Moon, Monitor, Info, Upload, Code, Shield, Zap, Key, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UploadPage from './pages/UploadPage'
import DownloadPage from './pages/DownloadPage'
import SnippetPage from './pages/SnippetPage'
import FullEditorPage from './pages/FullEditorPage'
import { useRecentUploads, RecentSection } from './components/Shared'

const THEME_KEY = 'filesnaps_theme'

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'system' } catch { return 'system' }
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handler(e) {
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return [theme, setTheme]
}

function ThemeSwitcher({ theme, setTheme }) {
  const themes = [
    { key: 'system', icon: Monitor, label: 'System' },
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'light', icon: Sun, label: 'Light' },
  ]

  return (
    <div className="flex items-center bg-surface-raised/80 border border-border-default rounded-xl p-0.5 shadow-sm backdrop-blur-sm">
      {themes.map(t => {
        const Icon = t.icon
        return (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-300 ${theme === t.key ? 'bg-surface-hover text-text-secondary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'}`}
            title={t.label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function Header({ theme, setTheme }) {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border-default">
      <div className="mx-auto h-14 flex items-center justify-between px-4 sm:px-6 max-w-4xl">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="FileSnaps" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-sm sm:text-base font-bold text-text-primary tracking-tight">FileSnaps</span>
          </Link>
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/about">
              <Info className="w-3.5 h-3.5" />
              About
            </Link>
          </Button>
        </div>
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </div>
    </header>
  )
}

function ToolPage() {
  const [mode, setMode] = useState(() => sessionStorage.getItem('filesnaps_mode') || 'upload')
  const { recents } = useRecentUploads()

  useEffect(() => {
    sessionStorage.setItem('filesnaps_mode', mode)
  }, [mode])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-white">
              <Upload className="w-4 h-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="snippet" className="gap-2 data-[state=active]:bg-accent data-[state=active]:text-white">
              <Code className="w-4 h-4" />
              Create Snippet
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <UploadPage />
          </TabsContent>
          <TabsContent value="snippet">
            <SnippetPage />
          </TabsContent>
        </Tabs>
        <RecentSection recents={recents} />
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useTheme()
  const location = useLocation()
  const isFullPage = location.pathname.startsWith('/files/') || location.pathname.startsWith('/editor/')

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {!isFullPage && <Header theme={theme} setTheme={setTheme} />}

      <main className="flex-1 w-full relative">
        <div className="fixed inset-0 bg-accent-glow pointer-events-none" />
        <div className="fixed inset-0 bg-dot-grid pointer-events-none" />
        <div className="relative z-10">
          <Routes location={location}>
          <Route path="/" element={<ToolPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/files/:id" element={<DownloadPage />} />
          <Route path="/editor/full" element={<FullEditorPage />} />
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function AboutPage() {
  const features = [
    {
      icon: Lock, title: 'Password protected',
      desc: 'Every file is encrypted with your password using SHA-256 hashing. Only recipients with the password can access it.',
    },
    {
      icon: Clock, title: 'Auto-expiring links',
      desc: 'Set expiration from 1 minute to 7 days. Files are automatically deleted after the timer runs out.',
    },
    {
      icon: Zap, title: 'Blazing fast',
      desc: 'Built on Cloudflare\'s global edge network. Files upload and download with minimal latency from anywhere in the world.',
    },
    {
      icon: Key, title: 'No sign-up',
      desc: 'No accounts, no email verification, no tracking. Just upload, set a password, and share the link.',
    },
  ]

  const steps = [
    { step: '01', title: 'Upload or write', desc: 'Drag and drop any file up to 100 MB, or write a code snippet. All file types supported.' },
    { step: '02', title: 'Set a password', desc: 'Choose a strong password to encrypt and protect your content. Or share without a password via token link.' },
    { step: '03', title: 'Choose expiration', desc: 'Pick how long the content should be available. It auto-deletes after the timer expires.' },
    { step: '04', title: 'Share the link', desc: 'Copy the unique link and send it to your recipient. They just need the password to access it.' },
  ]

  return (
    <div className="animate-fade-in">
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-accent/20 bg-accent-subtle text-accent text-xs animate-scale-in">
              <Shield className="w-3.5 h-3.5 mr-1" />
              End-to-end encrypted
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-[1.05]">
              Share Files
              <span className="block mt-2 gradient-text">Securely and Privately</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed">
              Encrypted uploads, password-protected downloads, and automatic expiration. No accounts needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="group relative bg-surface-raised border border-border-default rounded-2xl p-6 card-hover overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-center w-12 h-12 bg-accent-subtle text-accent mb-4 group-hover:bg-accent/15 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-accent/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">{f.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative py-14 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.06),transparent_60%)] pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="outline" className="mb-4 border-accent/20 bg-accent-subtle text-accent">
              <Clock className="w-3.5 h-3.5 mr-1" /> How it works
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Simple, secure sharing</h2>
            <p className="mt-2 text-sm text-text-muted">Four steps to share any file or code snippet privately.</p>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent/40 via-accent/10 to-transparent hidden sm:block" />
            <div className="space-y-10">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-4 sm:gap-6 animate-in relative">
                  <span className="relative z-10 flex items-center justify-center w-12 h-12 rounded-xl bg-surface-raised border border-border-default text-base font-bold text-accent shrink-0 group-hover:border-accent/30 group-hover:bg-accent-subtle transition-all">
                    {s.step}
                  </span>
                  <div className="pt-2">
                    <h3 className="text-lg font-semibold text-text-primary">{s.title}</h3>
                    <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 border-t border-border-default">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 sm:p-7 bg-gradient-to-br from-surface-raised to-surface-overlay border border-border-default rounded-2xl card-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-subtle text-accent">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-text-primary">Security first</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">Files are encrypted at rest. Passwords hashed with SHA-256 and salted. Expired files permanently deleted.</p>
            </div>
            <div className="p-6 sm:p-7 bg-gradient-to-br from-surface-raised to-surface-overlay border border-border-default rounded-2xl card-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-subtle text-accent">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-text-primary">Auto-deletion</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">Set precise expiration times. Files vanish from our servers the moment they expire. No traces left behind.</p>
            </div>
            <div className="p-6 sm:p-7 bg-gradient-to-br from-surface-raised to-surface-overlay border border-border-default rounded-2xl card-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-subtle text-accent">
                  <Key className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-text-primary">Private by design</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">No accounts, no tracking, no data mining. Your files are between you and your recipient. Period.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-default bg-surface-raised/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="w-5 h-5 opacity-70" />
              <span className="text-sm font-bold text-text-primary">FileSnaps</span>
              <span className="text-xs text-text-muted/60">v1.0</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <Link to="/" className="hover:text-text-secondary transition-colors">Home</Link>
              <span className="text-text-muted/40">&middot;</span>
              <span>Encrypted file &amp; code sharing</span>
              <span className="text-text-muted/40">&middot;</span>
              <span>Built with Cloudflare Workers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <span className="inline-flex items-center justify-center w-16 h-16 bg-surface-overlay">
          <FileText className="w-8 h-8 text-text-muted" />
        </span>
        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-bold text-text-primary">Page not found</h1>
          <p className="text-sm text-text-muted leading-relaxed">This page doesn't exist or has been moved.</p>
        </div>
        <Button variant="default" size="sm" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}

export default App
