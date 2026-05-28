import { useCalendar } from "../../contexts/calendar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UserSelect() {
  const { users, selectedUserId, setSelectedUserId } = useCalendar()

  if (users.length === 0) return null

  return (
    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
      <SelectTrigger className="flex-1 md:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {users.slice(0, 3).map(user => (
                <Avatar key={user.id} className="size-5 border border-background">
                  <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            All
          </div>
        </SelectItem>
        {users.map(user => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
              </Avatar>
              <p className="truncate">{user.name}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
