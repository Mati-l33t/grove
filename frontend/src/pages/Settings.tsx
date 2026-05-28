import { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bell, BellOff, Camera, Copy, LogOut, Users } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import { useHousehold } from '@/hooks/useHousehold'
import { MEMBER_COLORS } from '@/lib/constants'
import TopBar from '@/components/layout/TopBar'
import HouseholdSetupDialog from '@/components/auth/HouseholdSetupDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { NotificationPrefs, User } from '@/types'

const PUSH_NOTIF_ITEMS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'push_event_assigned',    label: 'Event shared with you',          description: 'When another member adds you to an event' },
  { key: 'push_list_assigned',     label: 'List assigned to you',           description: 'When a to-do or shopping list is assigned to you' },
  { key: 'push_list_item_added',   label: 'Item added to your list',        description: 'When someone adds an item to a list assigned to you' },
  { key: 'push_recipe_shared',     label: 'Recipe shared with household',   description: 'When a new recipe is added to your household' },
  { key: 'push_school_lunch',      label: 'School lunch added',             description: "When a lunch menu is added for a child" },
  { key: 'push_school_assignment', label: 'School assignment added',        description: "When a new assignment is added for a child" },
]

const EMAIL_NOTIF_ITEMS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'email_event_assigned',    label: 'Event shared with you' },
  { key: 'email_list_assigned',     label: 'List assigned to you' },
  { key: 'email_list_item_added',   label: 'Item added to your list' },
  { key: 'email_recipe_shared',     label: 'Recipe shared with household' },
  { key: 'email_school_lunch',      label: 'School lunch added' },
  { key: 'email_school_assignment', label: 'School assignment added' },
]

function defaultPrefs(saved: NotificationPrefs | undefined): NotificationPrefs {
  return {
    push_event_assigned:    saved?.push_event_assigned    ?? true,
    push_list_assigned:     saved?.push_list_assigned     ?? true,
    push_list_item_added:   saved?.push_list_item_added   ?? true,
    push_recipe_shared:     saved?.push_recipe_shared     ?? true,
    push_school_lunch:      saved?.push_school_lunch      ?? true,
    push_school_assignment: saved?.push_school_assignment ?? true,
    email_event_assigned:    saved?.email_event_assigned    ?? false,
    email_list_assigned:     saved?.email_list_assigned     ?? false,
    email_list_item_added:   saved?.email_list_item_added   ?? false,
    email_recipe_shared:     saved?.email_recipe_shared     ?? false,
    email_school_lunch:      saved?.email_school_lunch      ?? false,
    email_school_assignment: saved?.email_school_assignment ?? false,
  }
}

function tabFromPath(pathname: string): string {
  if (pathname === '/settings/notifications') return 'notifications'
  return 'profile'
}

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, household, setUser, setHousehold, logout } = useAuthStore()
  const { leaveHousehold, fetchHousehold } = useHousehold()

  const { supported: notifSupported, permission: notifPermission, requestPermission } = useNotifications()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [selectedColor, setSelectedColor] = useState(user?.color ?? MEMBER_COLORS[0])
  const [timeFormat, setTimeFormat] = useState<'auto' | '12h' | '24h'>(user?.time_format ?? 'auto')
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>(user?.week_start ?? 'monday')
  const [showWeather, setShowWeather] = useState(user?.show_weather ?? false)
  const [weatherUnit, setWeatherUnit] = useState<'celsius' | 'fahrenheit'>(user?.weather_unit ?? 'celsius')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leavingHousehold, setLeavingHousehold] = useState(false)
  const [showHouseholdSetup, setShowHouseholdSetup] = useState(false)

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => defaultPrefs(user?.notification_prefs))
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    setPrefs(defaultPrefs(user?.notification_prefs))
  }, [user?.notification_prefs])

  useEffect(() => {
    if (user?.household && !household) {
      fetchHousehold(user.household)
        .then(setHousehold)
        .catch(() => {})
    }
  }, [user?.household])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (username.trim()) formData.append('username', username.trim())
      formData.append('color', selectedColor)
      if (timeFormat !== 'auto') formData.append('time_format', timeFormat)
      else formData.append('time_format', '')
      formData.append('week_start', weekStart)
      formData.append('show_weather', String(showWeather))
      formData.append('weather_unit', weatherUnit)
      if (avatarFile) formData.append('avatar', avatarFile)

      const updated = await pb.collection('users').update(user.id, formData)
      pb.authStore.save(pb.authStore.token!, updated)
      const updatedUser = updated as unknown as User
      setUser(updatedUser)
      setUsername(updatedUser.username ?? '')
      setAvatarFile(null)
      setAvatarPreview(null)
      toast.success('Profile saved.')
    } catch {
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePrefs() {
    if (!user) return
    setSavingPrefs(true)
    try {
      const updated = await pb.collection('users').update(user.id, { notification_prefs: prefs })
      pb.authStore.save(pb.authStore.token!, updated)
      setUser(updated as unknown as User)
      toast.success('Notification settings saved.')
    } catch {
      toast.error('Failed to save notification settings.')
    } finally {
      setSavingPrefs(false)
    }
  }

  async function handleLeaveHousehold() {
    setLeavingHousehold(true)
    try {
      await leaveHousehold()
      toast.success('Left household.')
    } catch {
      toast.error('Failed to leave household.')
    } finally {
      setLeavingHousehold(false)
    }
  }

  function copyInviteCode() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code)
    toast.success('Invite code copied!')
  }

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const avatarUrl = avatarPreview
    ?? (user?.avatar ? pb.files.getUrl(user as never, user.avatar, { thumb: '100x100' }) : null)

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <TopBar title="Settings" />

      <div className="max-w-5xl mx-auto p-4 md:px-8 space-y-6">
        <Tabs
          defaultValue={tabFromPath(location.pathname)}
          onValueChange={(v) => {
            if (v === 'notifications') navigate('/settings/notifications', { replace: true })
            else navigate('/settings', { replace: true })
          }}
        >
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* ── Profile tab ── */}
          <TabsContent value="profile" className="pt-4">
            <Card>
              <CardContent className="pt-6 space-y-6">

                {/* Avatar row */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="relative group focus:outline-none shrink-0"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change avatar"
                  >
                    <Avatar className="h-14 w-14">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name} />}
                      <AvatarFallback style={{ backgroundColor: selectedColor }} className="text-white text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-5 w-5 text-white" />
                    </span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {/* Two-column grid for form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

                  {/* Left col */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-username">Login username</Label>
                      <Input
                        id="profile-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your.username"
                        autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Time format</Label>
                      <div className="flex gap-2">
                        {([
                          { key: 'auto', label: 'Auto' },
                          { key: '24h',  label: '24h'  },
                          { key: '12h',  label: '12h'  },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setTimeFormat(key)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                              timeFormat === key
                                ? 'bg-primary/10 text-primary border-primary/40'
                                : 'border-input text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Auto follows your browser locale.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Week starts on</Label>
                      <div className="flex gap-2">
                        {([
                          { key: 'monday', label: 'Monday' },
                          { key: 'sunday', label: 'Sunday' },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setWeekStart(key)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                              weekStart === key
                                ? 'bg-primary/10 text-primary border-primary/40'
                                : 'border-input text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right col */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Calendar color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {MEMBER_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="h-8 w-8 rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                            aria-label={color}
                            onClick={() => setSelectedColor(color)}
                          >
                            {selectedColor === color && (
                              <span className="flex items-center justify-center h-full w-full text-white text-xs font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Weather on Today page</Label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showWeather}
                          onChange={(e) => setShowWeather(e.target.checked)}
                          className="h-4 w-4 accent-primary cursor-pointer rounded"
                        />
                        <span className="text-sm">Show current weather</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Uses your browser's location if permission is granted, otherwise falls back to approximate IP-based location.
                      </p>
                      {showWeather && (
                        <div className="flex gap-2">
                          {([
                            { key: 'celsius'    as const, label: '°C — Celsius'    },
                            { key: 'fahrenheit' as const, label: '°F — Fahrenheit' },
                          ]).map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setWeatherUnit(key)}
                              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                weatherUnit === key
                                  ? 'bg-primary/10 text-primary border-primary/40'
                                  : 'border-input text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Household section */}
                <Separator />

                {household ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{household.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="text-sm font-mono font-bold tracking-widest text-primary">
                            {household.invite_code}
                          </code>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyInviteCode} aria-label="Copy invite code">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Share this code so others can join.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={handleLeaveHousehold}
                      disabled={leavingHousehold}
                    >
                      {leavingHousehold ? 'Leaving…' : 'Leave household'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">No household</p>
                        <p className="text-xs text-muted-foreground">
                          Create or join a household to share calendars, lists, and recipes.
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => setShowHouseholdSetup(true)}>
                      Set up household
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <Separator />

                <div className="flex items-center justify-between">
                  <Button onClick={handleSaveProfile} disabled={saving || !name.trim()}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { logout(); navigate('/login') }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications tab ── */}
          <TabsContent value="notifications" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

              {/* Push notifications — left */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4" />
                    Push notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!notifSupported ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BellOff className="h-4 w-4 shrink-0" />
                      Not supported in this browser.
                    </div>
                  ) : notifPermission === 'denied' ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BellOff className="h-4 w-4 shrink-0" />
                      Blocked in browser settings. Open your browser's site settings to allow notifications.
                    </div>
                  ) : notifPermission !== 'granted' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Enable push notifications to receive alerts even when Grove is closed.
                      </p>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          const result = await requestPermission()
                          if (result === 'denied') toast.error('Notifications blocked. Allow them in browser settings.')
                          else if (result === 'granted') toast.success('Push notifications enabled!')
                        }}
                      >
                        <Bell className="h-4 w-4" />
                        Enable push notifications
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-primary mb-1">
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        Push notifications are enabled
                      </div>
                      <div className="space-y-2">
                        {PUSH_NOTIF_ITEMS.map(({ key, label, description }) => (
                          <label key={key} className="flex items-start gap-3 cursor-pointer select-none py-1">
                            <input
                              type="checkbox"
                              checked={prefs[key] !== false}
                              onChange={(e) => setPref(key, e.target.checked)}
                              className="mt-0.5 h-4 w-4 accent-primary cursor-pointer rounded shrink-0"
                            />
                            <div>
                              <span className="text-sm font-medium">{label}</span>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Email notifications — right */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Email notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Sent to <span className="font-medium text-foreground">{user?.email}</span>.
                    Requires SMTP to be configured by an admin.
                  </p>
                  <div className="space-y-2">
                    {EMAIL_NOTIF_ITEMS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer select-none py-1">
                        <input
                          type="checkbox"
                          checked={prefs[key] === true}
                          onChange={(e) => setPref(key, e.target.checked)}
                          className="h-4 w-4 accent-primary cursor-pointer rounded shrink-0"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>

            <Button onClick={handleSavePrefs} disabled={savingPrefs}>
              {savingPrefs ? 'Saving…' : 'Save notification settings'}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <HouseholdSetupDialog
        open={showHouseholdSetup}
        onSkip={() => setShowHouseholdSetup(false)}
      />
    </>
  )
}
