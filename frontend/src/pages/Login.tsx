import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import { useHousehold } from '@/hooks/useHousehold'
import { useInstanceSettings } from '@/hooks/useAdmin'
import AppLogo from '@/components/layout/AppLogo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { User } from '@/types'

export default function Login() {
  const navigate = useNavigate()
  const { setUser, setHousehold } = useAuthStore()
  const { fetchHousehold } = useHousehold()
  const { data: appSettings } = useInstanceSettings()

  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const auth = await pb.collection('users').authWithPassword(identity, password)
      const user = auth.record as unknown as User
      setUser(user)

      if (user.household) {
        try {
          const household = await fetchHousehold(user.household)
          setHousehold(household)
        } catch {
          // household might have been deleted
        }
      }

      navigate('/')
    } catch {
      toast.error('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

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

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identity">Email or username</Label>
                <Input
                  id="identity"
                  type="text"
                  placeholder="you@example.com or username"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
