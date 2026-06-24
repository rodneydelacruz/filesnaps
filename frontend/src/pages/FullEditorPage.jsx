import { useState, useRef, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import hljs from 'highlight.js'
import { Code, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LANG_MAP = {
  javascript: 'JavaScript', typescript: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
  python: 'Python', html: 'HTML', css: 'CSS', json: 'JSON',
  markdown: 'Markdown', sql: 'SQL', bash: 'Shell', go: 'Go',
  rust: 'Rust', java: 'Java', cpp: 'C++', csharp: 'C#',
  php: 'PHP', ruby: 'Ruby', swift: 'Swift', kotlin: 'Kotlin',
  yaml: 'YAML', plaintext: 'Plain Text',
}

export default function FullEditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [code, setCode] = useState(location.state?.code || '')
  const [wordWrap, setWordWrap] = useState(true)
  const language = location.state?.language || null
  const editorRef = useRef(null)
  const wrapperRef = useRef(null)

  const lineCount = code.split('\n').length

  useLayoutEffect(() => {
    const ta = editorRef.current
    if (ta) {
      ta.style.height = '0px'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [code])

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = editorRef.current
      if (!ta) return
      const start = ta.selectionStart, end = ta.selectionEnd
      setCode(prev => prev.slice(0, start) + '  ' + prev.slice(end))
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  function handleDone() {
    navigate('/', { state: { code } })
  }

  return (
    <div className="h-screen w-screen bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-raised/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleDone} className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-text-muted/30">|</span>
          <Code className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-medium text-text-muted">
            {language ? (LANG_MAP[language] || language) : 'Code'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setWordWrap(!wordWrap)}
            className={`text-[10px] transition-colors ${wordWrap ? 'text-accent' : 'text-text-muted/50 hover:text-text-muted'}`}
          >
            {wordWrap ? 'Wrap' : 'No wrap'}
          </button>
          <span className="text-xs text-text-muted font-mono">
            {code.length > 1024 ? `${(code.length / 1024).toFixed(1)} KB` : `${code.length} B`}
          </span>
          <Button onClick={handleDone} size="sm" variant="default">
            Done
          </Button>
        </div>
      </div>
      <div ref={wrapperRef} className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          <div className="select-none text-right pr-3 py-4 text-sm font-mono leading-[1.5] text-text-muted/30 shrink-0"
            style={{ minWidth: `${Math.max(String(lineCount).length, 2) * 0.75 + 1.5}rem` }}
            aria-hidden
          >
            {code.split('\n').map((_, i) => (
              <div key={i} className="hover:text-text-muted/60 transition-colors">{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your code here..."
              className={`w-full bg-transparent border-0 py-4 pr-6 pl-0 text-sm font-mono text-text-primary placeholder:text-text-muted/40 resize-none overflow-hidden focus:outline-none leading-[1.5] ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}
