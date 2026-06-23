import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileIcon, formatBytes } from '../components/Shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ArrowLeft, Clock, Copy, Trash2, Loader2, ShieldAlert, Lock, Eye, Ban, CheckCircle, AlertTriangle } from 'lucide-react'

const DOWNLOAD_OPTIONS = [
  { v: 0, l: 'Unlimited' }, { v: 1, l: '1 download' }, { v: 3, l: '3 downloads' }, { v: 5, l: '5 downloads' }, { v: 10, l: '10 downloads' },
]

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><Skeleton className="w-5 h-5 rounded" /><Skeleton className="h-5 w-20" /></div>
      <Skeleton className="h-7 w-48" />
      <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
    </div>
  )
}

function StatRow({ icon: Icon, label, value, color, badge }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-default last:border-b-0 group">
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`w-4 h-4 text-text-muted/40 group-hover:text-text-muted transition-colors`} />}
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge === 'active' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>{badge}</span>}
        <span className={`text-sm font-semibold ${color || 'text-text-secondary'}`}>{value}</span>
      </div>
    </div>
  )
}

function getStoredUploads() {
  try { return JSON.parse(localStorage.getItem('filesnaps_uploads') || '[]') } catch { return [] }
}

function saveStoredUploads(uploads) {
  localStorage.setItem('filesnaps_uploads', JSON.stringify(uploads.slice(0, 50)))
}

function removeFromStorage(id) {
  const uploads = getStoredUploads().filter(u => u.id !== id)
  saveStoredUploads(uploads)
}

export default function ManagePage() {
  const { id } = useParams()
  const [adminToken, setAdminToken] = useState('')
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredUploads()
    const upload = stored.find(u => u.id === id)
    if (upload?.adminToken) setAdminToken(upload.adminToken)
  }, [id])

  useEffect(() => {
    if (!adminToken) { setLoading(false); return }
    setLoading(true)
    fetchMeta()
  }, [id, adminToken])

  async function fetchMeta() {
    try {
      const res = await fetch(`/api/manage/${id}`, { headers: { 'X-Admin-Token': adminToken } })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Not found'); return }
      setMeta(data)
    } catch { setError('Connection error') }
    finally { setLoading(false) }
  }

  async function doAction(action, endpoint) {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/manage/${id}/${endpoint}`, { method: 'POST', headers: { 'X-Admin-Token': adminToken } })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      if (action === 'delete') {
        removeFromStorage(id)
        toast.success('File permanently deleted')
        setMeta(null); setError('This file has been deleted.'); setDeleteDialogOpen(false)
        return
      }
      if (action === 'expire') {
        toast.success('File expired immediately')
        const newExpiresAt = Date.now() - 1000
        setMeta(prev => ({ ...prev, expiresAt: newExpiresAt }))
        const uploads = getStoredUploads()
        const idx = uploads.findIndex(u => u.id === id)
        if (idx >= 0) { uploads[idx].expiresAt = newExpiresAt; saveStoredUploads(uploads) }
        return
      }
      toast.success('Settings updated')
      await fetchMeta()
    } catch { toast.error('Network error') }
    finally { setActionLoading('') }
  }

  async function updateSettings(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    setActionLoading('update')
    try {
      const res = await fetch(`/api/manage/${id}/update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
        body: JSON.stringify({
          maxDownloads: parseInt(form.get('maxDownloads') || '0', 10),
          burnAfterReading: form.get('burnAfterReading') === 'on',
          expirationMinutes: parseInt(form.get('expiration') || '0', 10) || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      toast.success('Settings updated')
      await fetchMeta()
    } catch { toast.error('Network error') }
    finally { setActionLoading('') }
  }

  function handleTokenSubmit(e) {
    e.preventDefault()
    const token = tokenInput.trim()
    if (!token) return
    setAdminToken(token); setLoading(true); setError('')
  }

  if (loading) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
        </Button>
        <PageSkeleton />
      </div>
    )
  }

  if (!adminToken) {
    return (
      <div className="animate-fade-in">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
        </Button>
        <div className="max-w-sm mx-auto mt-8">
          <h1 className="text-xl font-bold text-text-primary text-center mb-6">Manage upload</h1>
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <input type="text" value={tokenInput} onChange={e => setTokenInput(e.target.value)}
              placeholder="Paste admin token"
              className="w-full bg-surface-raised border border-border-default px-3.5 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            <Button type="submit" disabled={!tokenInput.trim()} className="w-full">
              <Lock className="w-4 h-4" /> Authenticate
            </Button>
          </form>
          <p className="text-sm text-text-muted text-center mt-5">The admin token was shown when you uploaded the file.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
        </Button>
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-danger-bg">
            <ShieldAlert className="w-7 h-7 text-danger" />
          </span>
          <p className="text-sm text-text-muted font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (!meta) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
        </Button>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      </div>
    )
  }

  const isExpired = meta.expiresAt && Date.now() > meta.expiresAt

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/"><ArrowLeft className="w-4 h-4" />Back</Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">Manage upload</h1>
        <p className="text-sm text-text-muted mt-2 flex flex-wrap items-center gap-2">
          <span>File ID: <code className="font-mono text-xs bg-surface-overlay px-2 py-0.5 rounded">{id}</code></span>
          {!isExpired && (
            <>
              <span className="text-text-muted/50">&middot;</span>
              <Button variant="link" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/files/${id}`); toast.success('Download link copied') }}>
                <Copy className="w-3 h-3" /> Copy download link
              </Button>
            </>
          )}
        </p>
      </div>

      <Card className="card-hover">
        <CardContent className="p-0">
          <div className="p-5 sm:p-6 border-b border-border-default">
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {meta.files?.map((f, i) => (
                <div key={i} className="flex items-center gap-3 group/item hover:bg-surface-hover/50 transition-colors rounded-lg px-2 -mx-2 py-1">
                  <span className="text-accent"><FileIcon name={f.name} className="w-8 h-8" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{f.name}</p>
                    <p className="text-xs text-text-muted">{formatBytes(f.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 space-y-0">
            <StatRow icon={CheckCircle} label="Downloads" value={`${meta.downloadCount || 0}${meta.maxDownloads ? ` / ${meta.maxDownloads}` : ''}`} />
            <StatRow icon={AlertTriangle} label="Wrong attempts" value={meta.wrongPasswordCount || '0'} color={meta.wrongPasswordCount >= 5 ? 'text-danger' : undefined} />
            <StatRow icon={Eye} label="Burn after reading" value={meta.burnAfterReading ? 'Yes' : 'No'} />
            <StatRow icon={Clock} label="Expires" value={meta.expiresAt ? new Date(meta.expiresAt).toLocaleString() : 'No time limit'} />
            <StatRow icon={Ban} label="Status" value={isExpired ? 'Expired' : 'Active'} color={isExpired ? 'text-danger' : 'text-success'} badge={isExpired ? 'expired' : 'active'} />
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {!isExpired && (
              <Button onClick={() => doAction('expire', 'expire')} disabled={!!actionLoading} variant="outline" className="text-warning border-warning/30 hover:bg-warning-bg group">
                {actionLoading === 'expire' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 group-hover:animate-float" />}
                Expire now
              </Button>
            )}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!!actionLoading} className="text-danger border-danger-border hover:bg-danger-bg group">
                  <Trash2 className="w-4 h-4 group-hover:animate-float" /> Delete permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border-default">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this upload?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The file and all its data will be permanently deleted from the server.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { doAction('delete', 'delete') }} className="bg-danger hover:bg-danger/90">
                    {actionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {!isExpired && (
        <form onSubmit={updateSettings}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Max downloads</p>
                <Select name="maxDownloads" defaultValue={String(meta.maxDownloads || 0)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOWNLOAD_OPTIONS.map(o => (<SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="burnAfterReading" defaultChecked={meta.burnAfterReading} className="sr-only peer" />
                <Switch checked={meta.burnAfterReading} onCheckedChange={(checked) => {
                  const input = document.querySelector('input[name="burnAfterReading"]')
                  if (input) input.checked = checked
                }} />
                <span className="text-sm text-text-secondary">Burn after reading</span>
              </label>

              <Button type="submit" disabled={actionLoading === 'update'} className="w-full">
                {actionLoading === 'update' ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
