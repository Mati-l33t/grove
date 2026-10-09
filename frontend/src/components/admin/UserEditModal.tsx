import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAdminCreateUser, useAdminUpdateUser, useAdminHouseholds } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { MEMBER_COLORS, } from '@/lib/constants'
import { toUsername } from '@/lib/utils'
import pb from '@/lib/pb'
import type { AdminUser, UserPermissions } from '@/types'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  user?: AdminUser
  onClose: () => void
}

export default function UserEditModal({ open, mode, user, onClose }: Props) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuthStore()
  const createUser = useAdminCreateUser()
  const updateUser = useAdminUpdateUser()
  const { data: households } = useAdminHouseholds()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [color, setColor] = useState(MEMBER_COLORS[0])
  const [role, setRole] = useState<'adult' | 'child'>('adult')
  const [isAdmin, setIsAdmin] = useState(false)
  const [household, setHousehold] = useState<string>('')
  const [permissions, setPermissions] = useState<UserPermissions>({
    events: true, lists: true, recipes: true, meal_plan: true,
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAvatarFile(null)
    setAvatarPreview(null)
    if (mode === 'edit' && user) {
      setName(user.name)
      setUsername(user.username ?? '')
      setUsernameEdited(true)
      setEmail(user.email?.endsWith('@grove.local') ? '' : (user.email ?? ''))
      setNewPassword('')
      setPassword('')
      setColor(user.color || MEMBER_COLORS[0])
      setRole(user.role || 'adult')
      setIsAdmin(user.is_admin)
      setHousehold(user.household || '')
      setPermissions({
        events:    user.permissions?.events    !== false,
        lists:     user.permissions?.lists     !== false,
        recipes:   user.permissions?.recipes   !== false,
        meal_plan: user.permissions?.meal_plan !== false,
      })
    } else {
      setName('')
      setUsername('')
      setUsernameEdited(false)
      setEmail('')
      setPassword('')
      setNewPassword('')
      setColor(MEMBER_COLORS[0])
      setRole('adult')
      setIsAdmin(false)
      setHousehold('')
      setPermissions({ events: true, lists: true, recipes: true, meal_plan: true })
    }
  }, [open, mode, user])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      if (mode === 'create') {
        if (password.length < 8) {
          toast.error(t('admin.userEdit.toast.passwordShort'))
          return
        }
        await createUser.mutateAsync({
          name: name.trim(), username: username.trim(), email: email.trim(), password,
          color, role, is_admin: isAdmin, permissions, household: household || null,
        })
        toast.success(t('admin.userEdit.toast.created'))
      } else {
        if (newPassword && newPassword.length < 8) {
          toast.error(t('admin.userEdit.toast.newPasswordShort'))
          return
        }
        await updateUser.mutateAsync({
          id: user!.id, name: name.trim(), username: username.trim(), color, role,
          is_admin: isAdmin, permissions, household: household || null, avatar: avatarFile,
          newPassword: newPassword || undefined,
        })
        toast.success(t('admin.userEdit.toast.updated'))
      }
      onClose()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : null
      toast.error(msg || (mode === 'create' ? t('admin.userEdit.toast.createFailed') : t('admin.userEdit.toast.updateFailed')))
    }
  }

  const isPending = createUser.isPending || updateUser.isPending
  const isSelf = mode === 'edit' && user?.id === currentUser?.id

  const existingAvatarUrl = mode === 'edit' && user?.avatar
    ? pb.files.getURL(user as never, user.avatar, { thumb: '100x100' })
    : null
  const avatarUrl = avatarPreview ?? existingAvatarUrl
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? t('admin.userEdit.newUser') : t('admin.userEdit.editUser')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar — only shown when editing */}
          {mode === 'edit' && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative group focus:outline-none"
                onClick={() => fileRef.current?.click()}
                aria-label={t('admin.userEdit.changePhoto')}
              >
                <Avatar className="h-16 w-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback style={{ backgroundColor: color }} className="text-white text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </button>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{name || t('admin.userEdit.userFallback')}</p>
                <p>{t('admin.userEdit.clickPhoto')}</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="u-name">{t('admin.userEdit.name')}</Label>
            <Input
              id="u-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!usernameEdited) setUsername(toUsername(e.target.value))
              }}
              placeholder={t('admin.userEdit.name')}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-username">{t('admin.userEdit.username')}</Label>
            <Input
              id="u-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setUsernameEdited(true)
              }}
              placeholder={t('admin.userEdit.usernamePlaceholder')}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-email">
              {t('admin.userEdit.email')}
              {mode === 'create' && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t('admin.userEdit.optional')}</span>
              )}
            </Label>
            {mode === 'create' ? (
              <Input
                id="u-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('admin.userEdit.emailPlaceholder')}
                autoComplete="off"
              />
            ) : (
              <Input
                id="u-email"
                value={email}
                placeholder={t('admin.userEdit.noEmail')}
                readOnly
                className="text-muted-foreground cursor-default"
              />
            )}
          </div>

          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label htmlFor="u-password">{t('admin.userEdit.password')}</Label>
              <Input
                id="u-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('admin.userEdit.passwordPlaceholder')}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label htmlFor="u-newpassword">
                {t('admin.userEdit.newPassword')}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t('admin.userEdit.optional')}</span>
              </Label>
              <Input
                id="u-newpassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin.userEdit.newPasswordPlaceholder')}
                autoComplete="new-password"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('admin.userEdit.color')}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c
                      ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}`
                      : 'none',
                  }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
              <Label htmlFor="u-household">{t('admin.userEdit.household')}</Label>
              <select
                id="u-household"
                value={household}
                onChange={(e) => setHousehold(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('admin.userEdit.noHousehold')}</option>
                {households?.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

          <div className="space-y-1.5">
            <Label>{t('admin.userEdit.role')}</Label>
            <div className="flex gap-2">
              {(['adult', 'child'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    role === r
                      ? 'bg-primary/10 text-primary border-primary/40'
                      : 'border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'adult' ? t('admin.userEdit.roleAdult') : t('admin.userEdit.roleChild')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('admin.userEdit.permissions')}</Label>
            <div className="space-y-1.5">
              {([
                { key: 'events'    as const, label: t('admin.userEdit.permEvents') },
                { key: 'lists'     as const, label: t('admin.userEdit.permLists') },
                { key: 'recipes'   as const, label: t('admin.userEdit.permRecipes') },
                { key: 'meal_plan' as const, label: t('admin.userEdit.permMealPlan') },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permissions[key] !== false}
                    onChange={(e) => setPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                    className="h-4 w-4 accent-primary cursor-pointer rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              disabled={isSelf}
              className="h-4 w-4 accent-primary cursor-pointer rounded"
            />
            <span className="text-sm font-medium">{t('admin.userEdit.admin')}</span>
            {isSelf && (
              <span className="text-xs text-muted-foreground">{t('admin.userEdit.cantChangeOwn')}</span>
            )}
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={!name.trim() || !username.trim() || isPending}>
              {isPending ? t('common.saving') : mode === 'create' ? t('admin.userEdit.create') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
