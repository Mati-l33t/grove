import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  AlertTriangle, BookOpen, Bot, Calendar, Check, Copy, Eye, EyeOff, ExternalLink, Leaf, List, Mail,
  Pencil, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, Users2,
  Home,
} from 'lucide-react'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import {
  useAdminStats, useAdminHouseholds, useAdminUsers, useAdminDeleteUser,
  useInstanceSettings, useSaveInstanceSettings, useUploadInstanceLogo, useRemoveInstanceLogo,
  useSmtpSettings, useSaveSmtpSettings,
  useAiSettings, useSaveAiSettings,
  useUpdateCheck, useRunUpdate, useGroveRuntime,
} from '@/hooks/useAdmin'
import AdminShell from '@/components/admin/AdminShell'
import UserEditModal from '@/components/admin/UserEditModal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminUser } from '@/types'

// ─── Dashboard ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, loading, to,
}: {
  icon: React.ElementType; label: string; value?: number; loading: boolean; to?: string
}) {
  const inner = (
    <CardContent className="p-5 flex flex-col gap-2">
      <Icon className="h-5 w-5 text-primary" />
      {loading
        ? <Skeleton className="h-7 w-14" />
        : <p className="text-2xl font-bold">{value ?? 0}</p>
      }
      <p className="text-sm text-muted-foreground">{label}</p>
    </CardContent>
  )

  if (to) {
    return (
      <Card className="transition-colors hover:border-primary/50 cursor-pointer">
        <Link to={to} className="block">{inner}</Link>
      </Card>
    )
  }

  return <Card>{inner}</Card>
}

function HouseholdsCard() {
  const { data: households, isLoading } = useAdminHouseholds()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-2">
        <Home className="h-5 w-5 text-primary" />
        {isLoading
          ? <Skeleton className="h-7 w-14" />
          : <p className="text-2xl font-bold">{households?.length ?? 0}</p>
        }
        <p className="text-sm text-muted-foreground">Households</p>
        {!isLoading && households && households.length > 0 && (
          <div className="mt-1 space-y-1.5 border-t border-border pt-2">
            {households.map((h) => (
              <div key={h.id} className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{h.name}</span>
                <button
                  onClick={() => copyCode(h.id, h.invite_code)}
                  className="flex items-center gap-1 self-start rounded bg-muted px-1.5 py-0.5 text-xs font-mono hover:bg-muted/70 transition-colors"
                  title="Copy invite code"
                >
                  {h.invite_code}
                  {copiedId === h.id
                    ? <Check className="h-3 w-3 text-green-500" />
                    : <Copy className="h-3 w-3 text-muted-foreground" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardPanel() {
  const { data: stats, isLoading } = useAdminStats()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Users2}   label="Users"       value={stats?.users}       loading={isLoading} to="/admin/users" />
        <HouseholdsCard />
        <StatCard icon={Calendar} label="Events"      value={stats?.events}      loading={isLoading} to="/calendar" />
        <StatCard icon={List}     label="Lists"       value={stats?.lists}       loading={isLoading} to="/lists" />
        <StatCard icon={BookOpen} label="Recipes"     value={stats?.recipes}     loading={isLoading} to="/recipes" />
      </div>
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────

function UsersPanel() {
  const { user: currentUser } = useAuthStore()
  const deleteUser = useAdminDeleteUser()

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useAdminUsers(page, search)

  async function handleDelete(id: string) {
    try {
      await deleteUser.mutateAsync(id)
      toast.success('User deleted.')
      setDeletingId(null)
    } catch {
      toast.error('Failed to delete user.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          New user
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No users found.</p>
      ) : (
        <div className="space-y-2">
          {data?.items.map((u) => {
            const initials = (u.name || '?')
              .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
            const avatarUrl = u.avatar
              ? pb.files.getUrl(u as never, u.avatar, { thumb: '64x64' })
              : null
            const isDeletingThis = deletingId === u.id
            const isSelf = u.id === currentUser?.id

            return (
              <Card key={u.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={u.name} />}
                    <AvatarFallback
                      style={{ backgroundColor: u.color || '#22c55e' }}
                      className="text-white text-xs"
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{u.name}</span>
                      {u.is_admin && (
                        <Badge variant="secondary" className="text-xs gap-1 py-0 px-1.5">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {u.role === 'child' && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5">Child</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email?.endsWith('@grove.local') ? 'No email' : u.email}
                    </p>
                  </div>

                  <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                    {u.expand?.household?.name ?? <span className="opacity-40">—</span>}
                  </div>

                  <div className="hidden md:block text-xs text-muted-foreground shrink-0 tabular-nums">
                    {format(new Date(u.created), 'MMM d, yyyy')}
                  </div>

                  {isDeletingThis ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(u.id)}
                        disabled={deleteUser.isPending}
                      >
                        {deleteUser.isPending ? '…' : 'Yes'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                        No
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditTarget(u)}
                        aria-label="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingId(u.id)}
                        disabled={isSelf}
                        aria-label="Delete user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <UserEditModal
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
      />
      <UserEditModal
        open={!!editTarget}
        mode="edit"
        user={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}

// ─── AI settings ─────────────────────────────────────────────────────────────

function AiSettingsCard() {
  const { data: ai, isLoading } = useAiSettings()
  const save = useSaveAiSettings()
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  const [enabled, setEnabled]     = useState(false)
  const [apiUrl, setApiUrl]       = useState('')
  const [apiKey, setApiKey]       = useState('')
  const [defModel, setDefModel]   = useState('')

  useEffect(() => {
    if (ai) {
      setEnabled(ai.enabled ?? false)
      setApiUrl(ai.api_url || '')
      setApiKey(ai.api_key || '')
      setDefModel(ai.default_model || '')
    }
  }, [ai])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await save.mutateAsync({
        ...(ai?.id ? { id: ai.id } : {}),
        enabled,
        api_url: apiUrl.trim().replace(/\/$/, ''),
        api_key: apiKey.trim(),
        default_model: defModel.trim(),
      })
      toast.success('AI settings saved.')
    } catch {
      toast.error('Failed to save AI settings.')
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await pb.send('/api/grove/ai-models', { method: 'GET' })
      if (res.enabled && res.models?.length > 0) {
        toast.success(`Connected — ${res.models.length} model${res.models.length === 1 ? '' : 's'} available.`)
      } else if (res.enabled) {
        toast.success('Connected. No models returned (check API URL and key).')
      } else {
        toast.error('AI is disabled — save settings first.')
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Connection failed.'
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer rounded"
            />
            <span className="text-sm font-medium">Enable AI assistant</span>
          </label>

          {enabled && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="ai-url">API base URL</Label>
                <Input
                  id="ai-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.ollama.com/v1"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  OpenAI-compatible endpoint — Ollama cloud, OpenAI, Groq, etc.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-key">API key</Label>
                <div className="relative">
                  <Input
                    id="ai-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave blank if not required"
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-model">Default model</Label>
                <Input
                  id="ai-model"
                  value={defModel}
                  onChange={(e) => setDefModel(e.target.value)}
                  placeholder="llama3.3:70b"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Users can switch models in the chat. This is the default.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save AI settings'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!enabled || testing}
              onClick={handleTest}
            >
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

// ─── Updates ─────────────────────────────────────────────────────────────────

const DOCKER_UPDATE_CMD = 'docker compose pull && docker compose up -d'

function UpdateCard() {
  const { data: updateInfo, isLoading: checkLoading, refetch, isFetching } = useUpdateCheck()
  const { data: runtime, isLoading: runtimeLoading } = useGroveRuntime()
  const runUpdate = useRunUpdate()
  const [updateStarted, setUpdateStarted] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)

  const startCountdown = useCallback(() => {
    setSecondsLeft(45)
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); window.location.reload(); return 0 }
        return s - 1
      })
    }, 1000)
  }, [])

  async function handleUpdate() {
    try {
      await runUpdate.mutateAsync()
      setUpdateStarted(true)
      startCountdown()
    } catch {
      toast.error('Failed to start update.')
    }
  }

  function copyDockerCmd() {
    navigator.clipboard.writeText(DOCKER_UPDATE_CMD).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isLoading = checkLoading || runtimeLoading
  if (isLoading) return <Skeleton className="h-28 rounded-lg" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          App updates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Installed version</span>
          <Badge variant="outline">v{__APP_VERSION__}</Badge>
          {runtime === 'docker' && (
            <Badge variant="secondary" className="text-xs">Docker</Badge>
          )}
        </div>

        {updateStarted ? (
          <div className="flex items-center gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
            <span>Update in progress — reloading in {secondsLeft}s…</span>
          </div>
        ) : updateInfo?.hasUpdate ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-orange-500/10 border border-orange-500/20 px-3 py-2 text-sm text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span><span className="font-medium">v{updateInfo.latest}</span> is available</span>
            </div>

            {runtime === 'docker' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Run this on your server to update:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono">
                    {DOCKER_UPDATE_CMD}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyDockerCmd} className="shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleUpdate} disabled={runUpdate.isPending}>
                  {runUpdate.isPending ? 'Starting…' : 'Update now'}
                </Button>
                <Button variant="outline" asChild>
                  <a href={updateInfo.releaseUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Release notes
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : updateInfo ? (
          <p className="text-sm text-muted-foreground">Up to date</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Could not check for updates</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Checking…' : 'Retry'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Instance settings ────────────────────────────────────────────────────────

function SettingsPanel() {
  const { data: settings, isLoading } = useInstanceSettings()
  const save = useSaveInstanceSettings()
  const uploadLogo = useUploadInstanceLogo()
  const removeLogo = useRemoveInstanceLogo()
  const applyTheme = useThemeStore((s) => s.setTheme)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [appName, setAppName] = useState('')
  const [regOpen, setRegOpen] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const logoUrl = settings?.logo
    ? pb.files.getUrl(settings as never, settings.logo)
    : null

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !settings?.id) return
    try {
      await uploadLogo.mutateAsync({ id: settings.id, file })
      toast.success('Logo updated.')
    } catch {
      toast.error('Failed to upload logo.')
    }
    e.target.value = ''
  }

  async function handleLogoRemove() {
    if (!settings?.id || !settings.logo) return
    try {
      await removeLogo.mutateAsync({ id: settings.id, filename: settings.logo })
      toast.success('Logo removed.')
    } catch {
      toast.error('Failed to remove logo.')
    }
  }

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || '')
      setRegOpen(settings.registration_open ?? true)
      setTheme(settings.default_theme || 'dark')
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await save.mutateAsync({
        ...(settings?.id ? { id: settings.id } : {}),
        app_name: appName.trim(),
        registration_open: regOpen,
        default_theme: theme,
      })
      applyTheme(theme)
      toast.success('Settings saved.')
    } catch {
      toast.error('Failed to save settings.')
    }
  }

  if (isLoading) return <Skeleton className="h-64 rounded-lg" />

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instance settings</CardTitle>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="app-name">App name</Label>
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Grove"
              />
              <p className="text-xs text-muted-foreground">Shown in the sidebar header.</p>
            </div>

            <div className="space-y-2">
              <Label>Registration</Label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={regOpen}
                  onChange={(e) => setRegOpen(e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer rounded"
                />
                <span className="text-sm">Allow new registrations</span>
              </label>
              {!regOpen && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  New users won't be able to register while this is off.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Default theme</Label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
                      theme === t
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'border-input text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </CardContent>
        </form>

        <div className="px-6 pb-6 space-y-2 border-t border-border pt-5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg border border-border flex items-center justify-center bg-muted overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="App logo" className="h-full w-full object-contain p-1.5" />
              ) : (
                <Leaf className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  {uploadLogo.isPending ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload logo'}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogoRemove}
                    disabled={removeLogo.isPending}
                  >
                    {removeLogo.isPending ? 'Removing…' : 'Remove'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            className="sr-only"
            onChange={handleLogoChange}
          />
        </div>
      </Card>

      <MailSettingsCard />
    </div>
    <UpdateCard />
    <AiSettingsCard />
    </div>
  )
}

// ─── Mail settings ────────────────────────────────────────────────────────────

function MailSettingsCard() {
  const { data: smtp, isLoading } = useSmtpSettings()
  const save = useSaveSmtpSettings()
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)

  const [enabled, setEnabled] = useState(false)
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [secure, setSecure] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromAddress, setFromAddress] = useState('')

  useEffect(() => {
    if (smtp) {
      setEnabled(smtp.enabled ?? false)
      setHost(smtp.host || '')
      setPort(smtp.port || 587)
      setSecure(smtp.secure ?? false)
      setUsername(smtp.username || '')
      setPassword(smtp.password || '')
      setFromName(smtp.from_name || '')
      setFromAddress(smtp.from_address || '')
    }
  }, [smtp])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await save.mutateAsync({
        ...(smtp?.id ? { id: smtp.id } : {}),
        enabled,
        host: host.trim(),
        port,
        secure,
        username: username.trim(),
        password,
        from_name: fromName.trim(),
        from_address: fromAddress.trim(),
      })
      toast.success('Mail settings saved.')
    } catch {
      toast.error('Failed to save mail settings.')
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await pb.send('/api/grove/test-email', { method: 'POST' })
      toast.success(res.message || 'Test email sent.')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Failed to send test email.'
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) return <Skeleton className="h-48 rounded-lg" />

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Mail server
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer rounded"
            />
            <span className="text-sm font-medium">Enable email notifications</span>
          </label>

          {enabled && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="smtp-host">Host</Label>
                  <Input
                    id="smtp-host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    placeholder="587"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer rounded"
                />
                <span className="text-sm">SSL/TLS (port 465)</span>
                <span className="text-xs text-muted-foreground ml-1">Uncheck for STARTTLS (port 587)</span>
              </label>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-user">Username</Label>
                <Input
                  id="smtp-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass">Password</Label>
                <div className="relative">
                  <Input
                    id="smtp-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="App password or SMTP password"
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-name">From name</Label>
                  <Input
                    id="smtp-from-name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Grove"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-addr">From address</Label>
                  <Input
                    id="smtp-from-addr"
                    type="email"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="grove@family.home"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save mail settings'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!enabled || testing}
              onClick={handleTest}
            >
              {testing ? 'Sending…' : 'Send test email'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { pathname } = useLocation()

  const panel =
    pathname === '/admin/users'    ? <UsersPanel /> :
    pathname === '/admin/settings' ? <SettingsPanel /> :
    <DashboardPanel />

  return <AdminShell>{panel}</AdminShell>
}
