import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
      toast.success('Household created!')
      navigate('/')
    } catch {
      toast.error('Failed to create household. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return
    setLoading(true)
    try {
      await joinHousehold(inviteCode.trim())
      toast.success('Joined household!')
      navigate('/')
    } catch {
      toast.error('Invalid invite code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set up your household</DialogTitle>
          <DialogDescription>
            Create a new household or join an existing one with an invite code. You can also skip
            this and use Grove solo.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1 gap-2">
              <Users className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1 gap-2">
              <Hash className="h-4 w-4" />
              Join
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                placeholder="e.g. The Johnsons"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={loading || !householdName.trim()} className="w-full">
              {loading ? 'Creating…' : 'Create household'}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                placeholder="e.g. ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <Button onClick={handleJoin} disabled={loading || inviteCode.length < 6} className="w-full">
              {loading ? 'Joining…' : 'Join household'}
            </Button>
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={onSkip} disabled={loading} className="w-full text-muted-foreground">
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  )
}
