import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from '@/components/layout/LanguageSwitch'
import i18n, { LANGUAGE_STORAGE_KEY } from '@/lib/i18n'
import pb from '@/lib/pb'
import AppLogo from '@/components/layout/AppLogo'
import { useAuthStore } from '@/stores/authStore'
import { useInstanceSettings } from '@/hooks/useAdmin'
import { MEMBER_COLORS } from '@/lib/constants'
import { toUsername } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BorderBeam } from '@/components/ui/border-beam'
import HouseholdSetupDialog from '@/components/auth/HouseholdSetupDialog'
import type { User } from '@/types'

function savedLanguage(): string | null {
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) } catch { return null }
}

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { data: appSettings, isLoading: settingsLoading } = useInstanceSettings()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHousehold, setShowHousehold] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      toast.error(t('auth.usernameRequired'))
      return
    }
    if (password !== confirm) {
      toast.error(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const randomColor = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)]
      await pb.collection('users').create({
        name: name.trim(),
        username: username.trim(),
        email,
        password,
        passwordConfirm: confirm,
        color: randomColor,
        emailVisibility: true,
        ...(savedLanguage() ? { language: i18n.resolvedLanguage } : {}),
      })
      const auth = await pb.collection('users').authWithPassword(username.trim(), password)
      setUser(auth.record as unknown as User)
      setShowHousehold(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('auth.registrationFailed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const registrationClosed = !settingsLoading && appSettings !== undefined && appSettings !== null && !appSettings.registration_open

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <AppLogo className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight">{appSettings?.app_name || 'Grove'}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('auth.tagline')}</p>
        </div>

        {registrationClosed ? (
          <Card className="relative overflow-hidden">
            <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
              <p className="font-medium">{t('auth.registrationClosed')}</p>
              <p className="text-sm text-muted-foreground">
                {t('auth.registrationClosedHint')}
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/login">{t('auth.signInInstead')}</Link>
              </Button>
            </CardContent>
            <BorderBeam duration={6} size={300} />
          </Card>
        ) : (

          <Card className="relative overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{t('auth.createAccount')}</CardTitle>
            <CardDescription>{t('auth.createHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('settings.namePlaceholder')}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!usernameEdited) setUsername(toUsername(e.target.value))
                  }}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t('settings.username')}</Label>
                <Input
                  id="username"
                  placeholder={t('settings.usernamePlaceholder')}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setUsernameEdited(true)
                  }}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          </CardContent>
          <BorderBeam duration={6} size={300} />
          </Card>

        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
        <LanguageSwitch />
      </div>

      <HouseholdSetupDialog
        open={showHousehold}
        onSkip={() => navigate('/')}
      />
    </div>
  )
}
