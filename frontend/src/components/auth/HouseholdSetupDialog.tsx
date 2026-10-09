import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Users, Hash } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface HouseholdSetupDialogProps {
  open: boolean
  onSkip: () => void
}

export default function HouseholdSetupDialog({ open, onSkip }: HouseholdSetupDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { createHousehold, joinHousehold } = useHousehold()

  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!householdName.trim()) return
    setLoading(true)
    try {
      await createHousehold(householdName.trim())
      toast.success(t('householdSetup.created'))
      navigate('/')
    } catch {
      toast.error(t('householdSetup.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return
    setLoading(true)
    try {
      await joinHousehold(inviteCode.trim())
      toast.success(t('householdSetup.joined'))
      navigate('/')
    } catch {
      toast.error(t('householdSetup.invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('householdSetup.title')}</DialogTitle>
          <DialogDescription>
            {t('householdSetup.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1 gap-2">
              <Users className="h-4 w-4" />
              {t('householdSetup.tabCreate')}
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1 gap-2">
              <Hash className="h-4 w-4" />
              {t('householdSetup.tabJoin')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="household-name">{t('householdSetup.householdName')}</Label>
              <Input
                id="household-name"
                placeholder={t('householdSetup.householdNamePlaceholder')}
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={loading || !householdName.trim()} className="w-full">
              {loading ? t('householdSetup.creating') : t('householdSetup.createHousehold')}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-code">{t('householdSetup.inviteCode')}</Label>
              <Input
                id="invite-code"
                placeholder={t('householdSetup.inviteCodePlaceholder')}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <Button onClick={handleJoin} disabled={loading || inviteCode.length < 6} className="w-full">
              {loading ? t('householdSetup.joining') : t('householdSetup.joinHousehold')}
            </Button>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={onSkip} disabled={loading} className="w-full text-muted-foreground">
          {t('householdSetup.skip')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
