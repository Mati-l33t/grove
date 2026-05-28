import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckSquare, Copy, ExternalLink, ShoppingCart, Users, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfWeek } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import TopBar from '@/components/layout/TopBar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useActiveLists } from '@/hooks/useLists'
import { useWeekMealPlan } from '@/hooks/useMealPlan'
import pb from '@/lib/pb'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function HouseholdPage() {
  const { user, household } = useAuthStore()
  const membersQuery = useHouseholdMembers()
  const listsQuery = useActiveLists()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const mealsQuery = useWeekMealPlan(weekStart)
  const queryClient = useQueryClient()

  const [copied, setCopied] = useState(false)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)

  async function setRole(memberId: string, role: 'adult' | 'child') {
    setTogglingRole(memberId)
    try {
      await pb.collection('users').update(memberId, { role })
      await queryClient.invalidateQueries({ queryKey: ['household-members'] })
      toast.success(`Role updated to ${role}.`)
    } catch {
      toast.error('Failed to update role.')
    } finally {
      setTogglingRole(null)
    }
  }

  const members = membersQuery.data ?? []
  const allLists = listsQuery.data ?? []
  const weekMeals = mealsQuery.data ?? []

  const today = format(new Date(), 'yyyy-MM-dd')

  function copyCode() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!household) {
    return (
      <>
        <TopBar title="Household" />
        <div className="max-w-2xl mx-auto w-full p-4 md:px-8">
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-3">You're not part of a household yet.</p>
            <Link to="/settings/household" className="text-sm text-primary hover:underline">
              Create or join one →
            </Link>
          </div>
        </div>
      </>
    )
  }

  const InviteCode = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground flex-shrink-0">Invite code:</span>
      <code className="font-mono text-sm font-semibold tracking-widest bg-muted px-2.5 py-1 rounded flex-1 md:flex-none">
        {household.invite_code}
      </code>
      <button
        onClick={copyCode}
        className="h-7 w-7 flex items-center justify-center rounded-md border hover:bg-accent transition-colors flex-shrink-0"
        aria-label="Copy invite code"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-primary" />
          : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )

  return (
    <>
      <TopBar title={(household as { name?: string }).name || 'Household'} />

      <div className="max-w-4xl mx-auto w-full p-4 md:px-8 space-y-6">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{(household as { name?: string }).name || 'Household'}</h1>
            <p className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <InviteCode />
        </div>

        {/* Mobile invite code */}
        <div className="md:hidden">
          <InviteCode />
        </div>

        {/* Member cards */}
        {membersQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => {
              const assignedLists = allLists.filter((l) => l.assigned_to === member.id)
              const todayMeals = weekMeals.filter(
                (m) =>
                  m.date.startsWith(today) &&
                  (m.user === member.id || m.shared_with?.includes(member.id) || !!m.household)
              )
              const weekMealsForMember = weekMeals.filter(
                (m) => m.user === member.id || m.shared_with?.includes(member.id) || !!m.household
              )
              const isMe = member.id === user?.id

              return (
                <div key={member.id} className="rounded-xl border bg-card p-4 space-y-4">
                  {/* Member header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden"
                      style={{ backgroundColor: member.color || '#22c55e' }}
                    >
                      {member.avatar ? (
                        <img
                          src={`/api/files/_pb_users_auth_/${member.id}/${member.avatar}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{(member.name || member.email || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {member.name || member.email}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">you</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  <div className="flex-shrink-0 flex rounded-lg border overflow-hidden text-xs font-medium">
                    {(['adult', 'child'] as const).map((role, i) => {
                      const isActive = member.role === role || (!member.role && role === 'adult')
                      const canClick = user?.is_admin && !isMe && !isActive
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={!canClick || togglingRole === member.id}
                          onClick={() => canClick && setRole(member.id, role)}
                          className={cn(
                            'px-2.5 py-0.5 transition-colors capitalize',
                            i === 0 ? '' : 'border-l',
                            isActive
                              ? role === 'child'
                                ? 'bg-blue-500/15 text-blue-500'
                                : 'bg-green-500/15 text-green-600'
                              : canClick
                                ? 'text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer'
                                : 'text-muted-foreground/40 cursor-default'
                          )}
                        >
                          {role}
                        </button>
                      )
                    })}
                  </div>
                    <Link
                      to={`/meal-plan`}
                      className="text-xs text-primary hover:underline flex-shrink-0"
                    >
                      Plan meals
                    </Link>
                  </div>

                  {/* Assigned lists */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CheckSquare className="h-3 w-3" />
                      Assigned lists
                    </p>
                    {listsQuery.isLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : assignedLists.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nothing assigned</p>
                    ) : (
                      <div className="space-y-0.5">
                        {assignedLists.map((list) => {
                          const Icon = list.type === 'shopping' ? ShoppingCart : CheckSquare
                          return (
                            <Link
                              key={list.id}
                              to={`/lists/${list.id}`}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors group"
                            >
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0"
                                style={{ backgroundColor: list.color || '#22c55e' }}
                              >
                                <Icon className="h-3 w-3 text-white" />
                              </span>
                              <span className="text-sm truncate flex-1">{list.name}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 ml-auto flex-shrink-0 transition-opacity" />
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Today's meals */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <UtensilsCrossed className="h-3 w-3" />
                      Today's meals
                    </p>
                    {mealsQuery.isLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : todayMeals.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nothing planned today</p>
                    ) : (
                      <div className="space-y-0.5">
                        {MEAL_TYPES.map((type) => {
                          const meal = todayMeals.find((m) => m.meal_type === type)
                          if (!meal) return null
                          const label = meal.expand?.recipe?.title || meal.custom_meal || '—'
                          return (
                            <div key={type} className="flex gap-2 text-xs px-2">
                              <span className="text-muted-foreground capitalize w-16 flex-shrink-0">{type}</span>
                              <span className="truncate font-medium">{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* This week summary if today is empty */}
                  {!mealsQuery.isLoading && todayMeals.length === 0 && weekMealsForMember.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <UtensilsCrossed className="h-3 w-3" />
                        This week
                      </p>
                      <div className="space-y-0.5">
                        {weekMealsForMember.slice(0, 3).map((meal) => {
                          const label = meal.expand?.recipe?.title || meal.custom_meal || '—'
                          const dayLabel = format(new Date(meal.date.slice(0, 10) + 'T00:00:00'), 'EEE')
                          return (
                            <div key={meal.id} className="flex gap-2 text-xs px-2">
                              <span className="text-muted-foreground w-8 flex-shrink-0">{dayLabel}</span>
                              <span className="text-muted-foreground capitalize w-14 flex-shrink-0">{meal.meal_type}</span>
                              <span className="truncate font-medium">{label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="text-right">
          <Link to="/settings/household" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Manage household →
          </Link>
        </div>
      </div>
    </>
  )
}
