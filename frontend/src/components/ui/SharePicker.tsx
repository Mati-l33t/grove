import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import type { ShareMode } from '@/types'

interface Props {
  mode: ShareMode
  selectedMembers: string[]
  onChange: (mode: ShareMode, members: string[]) => void
  className?: string
}

export default function SharePicker({ mode, selectedMembers, onChange, className }: Props) {
  const { user, household } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()

  if (!household) return null

  const others = members.filter((m) => m.id !== user?.id)

  function toggleMember(id: string, checked: boolean) {
    const next = checked
      ? [...selectedMembers, id]
      : selectedMembers.filter((x) => x !== id)
    onChange('members', next)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">Visibility</p>
      <div className="flex flex-wrap gap-2">
        {(['private', 'household', 'members'] as ShareMode[]).map((opt) => {
          if (opt === 'members' && others.length === 0) return null
          const labels: Record<ShareMode, string> = {
            private: 'Only me',
            household: household ? `${(household as { name?: string }).name || 'Household'}` : 'Household',
            members: 'Specific people',
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt, opt === 'members' ? selectedMembers : [])}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                mode === opt
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {labels[opt]}
            </button>
          )
        })}
      </div>

      {mode === 'members' && others.length > 0 && (
        <div className="ml-1 space-y-1.5">
          {others.map((member) => (
            <label key={member.id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedMembers.includes(member.id)}
                onChange={(e) => toggleMember(member.id, e.target.checked)}
                className="h-4 w-4 accent-primary cursor-pointer rounded"
              />
              <span className="text-sm">{member.name || member.email}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
