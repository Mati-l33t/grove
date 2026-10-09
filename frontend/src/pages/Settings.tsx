import { useRef, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { LANGUAGES, applyLanguagePreference } from '@/lib/i18n'
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

type NotifItem = { key: keyof NotificationPrefs; label: ParseKeys; description: ParseKeys }

const PUSH_NOTIF_ITEMS: NotifItem[] = [
  { key: 'push_event_assigned',    label: 'settings.notif.eventAssigned',    description: 'settings.notif.eventAssignedDesc' },
  { key: 'push_list_assigned',     label: 'settings.notif.listAssigned',     description: 'settings.notif.listAssignedDesc' },
  { key: 'push_list_item_added',   label: 'settings.notif.listItemAdded',    description: 'settings.notif.listItemAddedDesc' },
  { key: 'push_recipe_shared',     label: 'settings.notif.recipeShared',     description: 'settings.notif.recipeSharedDesc' },
  { key: 'push_school_lunch',      label: 'settings.notif.schoolLunch',      description: 'settings.notif.schoolLunchDesc' },
  { key: 'push_school_assignment', label: 'settings.notif.schoolAssignment', description: 'settings.notif.schoolAssignmentDesc' },
]

const EMAIL_NOTIF_ITEMS: { key: keyof NotificationPrefs; label: ParseKeys }[] = [
  { key: 'email_event_assigned',    label: 'settings.notif.eventAssigned' },
  { key: 'email_list_assigned',     label: 'settings.notif.listAssigned' },
  { key: 'email_list_item_added',   label: 'settings.notif.listItemAdded' },
  { key: 'email_recipe_shared',     label: 'settings.notif.recipeShared' },
  { key: 'email_school_lunch',      label: 'settings.notif.schoolLunch' },
  { key: 'email_school_assignment', label: 'settings.notif.schoolAssignment' },
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
  const { t } = useTranslation()
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
  const [language, setLanguage] = useState<string>(user?.language ?? '')
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
      formData.append('language', language)
      formData.append('show_weather', String(showWeather))
      formData.append('weather_unit', weatherUnit)
      if (avatarFile) formData.append('avatar', avatarFile)

      const updated = await pb.collection('users').update(user.id, formData)
      pb.authStore.save(pb.authStore.token!, updated)
      const updatedUser = updated as unknown as User
      setUser(updatedUser)
      setUsername(updatedUser.username ?? '')
      applyLanguagePreference(updatedUser.language)
      setAvatarFile(null)
      setAvatarPreview(null)
      toast.success(t('settings.toast.profileSaved'))
    } catch {
      toast.error(t('settings.toast.profileFailed'))
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
      toast.success(t('settings.toast.prefsSaved'))
    } catch {
      toast.error(t('settings.toast.prefsFailed'))
    } finally {
      setSavingPrefs(false)
    }
  }

  async function handleLeaveHousehold() {
    setLeavingHousehold(true)
    try {
      await leaveHousehold()
      toast.success(t('settings.toast.leftHousehold'))
    } catch {
      toast.error(t('settings.toast.leaveFailed'))
    } finally {
      setLeavingHousehold(false)
    }
  }

  function copyInviteCode() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code)
    toast.success(t('settings.toast.inviteCopied'))
  }

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const avatarUrl = avatarPreview
    ?? (user?.avatar ? pb.files.getURL(user as never, user.avatar, { thumb: '100x100' }) : null)

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <TopBar title={t('settings.title')} />

      <div className="max-w-5xl mx-auto p-4 md:px-8 space-y-6">
        <Tabs
          defaultValue={tabFromPath(location.pathname)}
          onValueChange={(v) => {
            if (v === 'notifications') navigate('/settings/notifications', { replace: true })
            else navigate('/settings', { replace: true })
          }}
        >
          <TabsList>
            <TabsTrigger value="profile">{t('settings.tabProfile')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('settings.tabNotifications')}</TabsTrigger>
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
                    aria-label={t('settings.changeAvatar')}
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
                      <Label htmlFor="profile-name">{t('settings.name')}</Label>
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('settings.namePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-username">{t('settings.username')}</Label>
                      <Input
                        id="profile-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('settings.usernamePlaceholder')}
                        autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('settings.timeFormat')}</Label>
                      <div className="flex gap-2">
                        {([
                          { key: 'auto', label: t('common.auto') },
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
                      <p className="text-xs text-muted-foreground">{t('settings.timeFormatHint')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('settings.language')}</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[{ key: '', label: t('common.auto') }, ...LANGUAGES.map((l) => ({ key: l.code as string, label: l.label }))].map(({ key, label }) => (
                          <button
                            key={key || 'auto'}
                            type="button"
                            onClick={() => setLanguage(key)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                              language === key
                                ? 'bg-primary/10 text-primary border-primary/40'
                                : 'border-input text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{t('settings.languageHint')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('settings.weekStartsOn')}</Label>
                      <div className="flex gap-2">
                        {([
                          { key: 'monday', label: t('settings.monday') },
                          { key: 'sunday', label: t('settings.sunday') },
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
                      <Label>{t('settings.calendarColor')}</Label>
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
                      <Label>{t('settings.weatherOnToday')}</Label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showWeather}
                          onChange={(e) => setShowWeather(e.target.checked)}
                          className="h-4 w-4 accent-primary cursor-pointer rounded"
                        />
                        <span className="text-sm">{t('settings.showWeather')}</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.weatherHint')}
                      </p>
                      {showWeather && (
                        <div className="flex gap-2">
                          {([
                            { key: 'celsius'    as const, label: t('settings.celsius') },
                            { key: 'fahrenheit' as const, label: t('settings.fahrenheit') },
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
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyInviteCode} aria-label={t('settings.copyInviteCode')}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('settings.shareCodeHint')}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={handleLeaveHousehold}
                      disabled={leavingHousehold}
                    >
                      {leavingHousehold ? t('settings.leaving') : t('settings.leaveHousehold')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{t('settings.noHousehold')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.noHouseholdHint')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => setShowHouseholdSetup(true)}>
                      {t('settings.setUpHousehold')}
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <Separator />

                <div className="flex items-center justify-between">
                  <Button onClick={handleSaveProfile} disabled={saving || !name.trim()}>
                    {saving ? t('common.saving') : t('settings.saveChanges')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => { logout(); navigate('/login') }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('settings.signOut')}
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
                    {t('settings.pushNotifications')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!notifSupported ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BellOff className="h-4 w-4 shrink-0" />
                      {t('settings.pushUnsupported')}
                    </div>
                  ) : notifPermission === 'denied' ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BellOff className="h-4 w-4 shrink-0" />
                      {t('settings.pushBlocked')}
                    </div>
                  ) : notifPermission !== 'granted' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t('settings.pushEnableHint')}
                      </p>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={async () => {
                          const result = await requestPermission()
                          if (result === 'denied') toast.error(t('settings.toast.pushDenied'))
                          else if (result === 'granted') toast.success(t('settings.toast.pushOn'))
                        }}
                      >
                        <Bell className="h-4 w-4" />
                        {t('settings.enablePush')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-primary mb-1">
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        {t('settings.pushEnabled')}
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
                              <span className="text-sm font-medium">{t(label)}</span>
                              <p className="text-xs text-muted-foreground">{t(description)}</p>
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
                  <CardTitle className="text-base">{t('settings.emailNotifications')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <Trans
                      i18nKey="settings.emailSentTo"
                      values={{ email: user?.email }}
                      components={{ 1: <span className="font-medium text-foreground" /> }}
                    />
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
                        <span className="text-sm">{t(label)}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>

            <Button onClick={handleSavePrefs} disabled={savingPrefs}>
              {savingPrefs ? t('common.saving') : t('settings.saveNotifications')}
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
