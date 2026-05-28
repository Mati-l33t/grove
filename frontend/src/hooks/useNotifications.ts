import { createContext, useContext, useState, useEffect, useCallback, useRef, createElement } from 'react'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { NotificationPrefs } from '@/types'

interface NotificationCtx {
  supported: boolean
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
}

export const NotificationContext = createContext<NotificationCtx>({
  supported: false,
  permission: 'default',
  requestPermission: async () => 'default',
})

export const useNotifications = () => useContext(NotificationContext)

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

async function registerPushSubscription(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    const keyRes = await fetch('/vapid-public.txt')
    if (!keyRes.ok) return
    const vapidKey = (await keyRes.text()).trim()
    if (!vapidKey) return

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    const json = sub.toJSON()
    const endpoint = sub.endpoint
    const p256dh = json.keys?.p256dh ?? ''
    const auth = json.keys?.auth ?? ''

    const existing = await pb.collection('push_subscriptions')
      .getFirstListItem(`endpoint = "${endpoint}" && user = "${userId}"`)
      .catch(() => null)

    if (!existing) {
      await pb.collection('push_subscriptions').create({ user: userId, endpoint, p256dh, auth })
    }
  } catch {
    // Push not supported or permission denied at OS level
  }
}

function showNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icons/icon-192.png' })
}

// Returns true if the pref is enabled (push defaults to true, email defaults to false)
function isPushEnabled(prefs: NotificationPrefs, key: keyof NotificationPrefs): boolean {
  return prefs[key] !== false
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, household } = useAuthStore()
  const supported = typeof window !== 'undefined' && 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  )

  // Keep prefs in a ref so subscription callbacks always read the latest value
  // without needing to re-subscribe on every pref change.
  const prefsRef = useRef<NotificationPrefs>(user?.notification_prefs ?? {})
  useEffect(() => {
    prefsRef.current = user?.notification_prefs ?? {}
  }, [user?.notification_prefs])

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && user) {
      await registerPushSubscription(user.id)
    }
    return result
  }, [supported, user?.id])

  useEffect(() => {
    if (permission === 'granted' && user) {
      registerPushSubscription(user.id)
    }
  }, [user?.id, permission])

  useEffect(() => {
    if (!user || permission !== 'granted') return

    timers.current.forEach(clearTimeout)
    timers.current = []

    const unsubs: Array<() => void> = []

    // Household member adds an item to a shared list
    if (household) {
      pb.collection('list_items').subscribe('*', async (data) => {
        if (data.action !== 'create') return
        if (data.record.added_by === user.id) return
        try {
          const list = await pb.collection('lists').getOne(data.record.list)
          const isHouseholdList = list.household === household.id
          const isMyList = list.assigned_to === user.id
          if (!isHouseholdList && !isMyList) return
          if (!isPushEnabled(prefsRef.current, 'push_list_item_added')) return
          showNotification(`New item in ${list.name}`, data.record.text)
        } catch {}
      }).then((fn) => unsubs.push(fn)).catch(() => {})
    } else {
      // No household — still watch for items on lists assigned to this user
      pb.collection('list_items').subscribe('*', async (data) => {
        if (data.action !== 'create') return
        if (data.record.added_by === user.id) return
        if (!isPushEnabled(prefsRef.current, 'push_list_item_added')) return
        try {
          const list = await pb.collection('lists').getOne(data.record.list)
          if (list.assigned_to !== user.id) return
          showNotification(`New item in ${list.name}`, data.record.text)
        } catch {}
      }).then((fn) => unsubs.push(fn)).catch(() => {})
    }

    // Event shared with this user
    pb.collection('events').subscribe('*', async (data) => {
      if (data.action !== 'create') return
      const ev = data.record
      if (ev.user === user.id) return
      const sharedWith: string[] = Array.isArray(ev.shared_with) ? ev.shared_with : []
      if (!sharedWith.includes(user.id)) return
      if (!isPushEnabled(prefsRef.current, 'push_event_assigned')) return
      showNotification(`New event: ${ev.title}`, ev.description || 'You were added to an event')
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    // List assigned to this user
    pb.collection('lists').subscribe('*', async (data) => {
      if (data.action !== 'create') return
      const list = data.record
      if (list.user === user.id) return
      if (list.assigned_to !== user.id) return
      if (!isPushEnabled(prefsRef.current, 'push_list_assigned')) return
      showNotification(`List assigned to you`, list.name)
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    // Recipe shared with household
    if (household) {
      pb.collection('recipes').subscribe('*', async (data) => {
        if (data.action !== 'create') return
        const recipe = data.record
        if (recipe.user === user.id) return
        if (recipe.household !== household.id) return
        if (!isPushEnabled(prefsRef.current, 'push_recipe_shared')) return
        showNotification(`New recipe: ${recipe.title}`, 'Shared with your household')
      }).then((fn) => unsubs.push(fn)).catch(() => {})

      // School: new lunch added
      pb.collection('school_lunches').subscribe('*', async (data) => {
        if (data.action !== 'create') return
        const lunch = data.record
        if (lunch.user === user.id) return
        if (lunch.household !== household.id) return
        if (!isPushEnabled(prefsRef.current, 'push_school_lunch')) return
        try {
          const child = await pb.collection('school_children').getOne(lunch.child)
          showNotification(`Lunch added for ${child.name}`, lunch.meal)
        } catch {
          showNotification('New school lunch added', lunch.meal || '')
        }
      }).then((fn) => unsubs.push(fn)).catch(() => {})

      // School: new assignment added
      pb.collection('school_assignments').subscribe('*', async (data) => {
        if (data.action !== 'create') return
        const assignment = data.record
        if (assignment.user === user.id) return
        if (assignment.household !== household.id) return
        if (!isPushEnabled(prefsRef.current, 'push_school_assignment')) return
        try {
          const child = await pb.collection('school_children').getOne(assignment.child)
          showNotification(
            `New assignment for ${child.name}`,
            `${assignment.subject}: ${assignment.title}`
          )
        } catch {
          showNotification('New school assignment', `${assignment.subject}: ${assignment.title}`)
        }
      }).then((fn) => unsubs.push(fn)).catch(() => {})
    }

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      unsubs.forEach((fn) => fn())
    }
  }, [user?.id, household?.id, permission])

  return createElement(
    NotificationContext.Provider,
    { value: { supported, permission, requestPermission } },
    children
  )
}
