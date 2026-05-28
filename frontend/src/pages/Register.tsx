import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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

export default function Register() {
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
      toast.error('Please choose a username.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
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
      })
      const auth = await pb.collection('users').authWithPassword(username.trim(), password)
      setUser(auth.record as unknown as User)
      setShowHousehold(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
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
          <p className="text-sm text-muted-foreground">Your family organizer</p>
        </div>

        {registrationClosed ? (
          <Card className="relative overflow-hidden">
            <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
              <p className="font-medium">Registration is closed</p>
              <p className="text-sm text-muted-foreground">
                New accounts are not being accepted at this time.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/login">Sign in instead</Link>
              </Button>
            </CardContent>
            <BorderBeam duration={6} size={300} />
          </Card>
        ) : (

          <Card className="relative overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>Get started with Grove today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
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
                <Label htmlFor="username">Login username</Label>
                <Input
                  id="username"
                  placeholder="your.username"
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
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
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
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          </CardContent>
          <BorderBeam duration={6} size={300} />
          </Card>

        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <HouseholdSetupDialog
        open={showHousehold}
        onSkip={() => navigate('/')}
      />
    </div>
  )
}
