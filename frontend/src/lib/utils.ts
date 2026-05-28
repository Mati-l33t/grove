import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns first name unless two members share the same first name, in which case returns full name.
export function toUsername(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30) || 'user'
}

export function memberDisplayName(id: string, allMembers: { id: string; name?: string; email?: string }[]): string {
  const member = allMembers.find((m) => m.id === id)
  if (!member) return '?'
  const first = member.name?.split(' ')[0] || member.email || '?'
  const clash = allMembers.some((m) => m.id !== id && (m.name?.split(' ')[0] || m.email) === first)
  return clash ? (member.name || member.email || '?') : first
}
