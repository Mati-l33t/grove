import { useState, useRef, useEffect } from 'react'
import { Bot, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pb'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAiModels } from '@/hooks/useChat'

type ToolResult = {
  name: string
  args: Record<string, unknown>
  result: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  tool_results?: ToolResult[]
  loading?: boolean
}

function toolLabel(tr: ToolResult): string {
  let parsed: Record<string, unknown> = {}
  const args = tr.args as Record<string, unknown>
  try { parsed = JSON.parse(tr.result) } catch { /* empty */ }
  if (parsed.error) return `${tr.name} failed`
  if (tr.name === 'get_members')      return 'Looked up household members'
  if (tr.name === 'get_lists')        return 'Checked your lists'
  if (tr.name === 'create_list')      return `Created list "${parsed.name ?? ''}"`
  if (tr.name === 'get_list_items')   return 'Read list contents'
  if (tr.name === 'add_list_item')    return `Added "${parsed.text ?? ''}" to list`
  if (tr.name === 'check_list_item')  return `${parsed.checked ? 'Checked' : 'Unchecked'} item`
  if (tr.name === 'delete_list_item') return 'Deleted item'
  if (tr.name === 'get_today_events')    return "Checked today's calendar"
  if (tr.name === 'get_upcoming_events') return `Checked upcoming events`
  if (tr.name === 'create_event')     return `Created event "${parsed.title ?? ''}"`
  if (tr.name === 'update_event')     return `Updated event "${parsed.title ?? ''}"`
  if (tr.name === 'delete_event')     return 'Deleted event'
  if (tr.name === 'update_list')      return `Updated list "${parsed.name ?? ''}"`
  if (tr.name === 'archive_list')     return 'Archived list'
  if (tr.name === 'delete_list')      return 'Deleted list'
  if (tr.name === 'get_meal_plan')    return 'Checked the meal plan'
  if (tr.name === 'set_meal_plan')    return `Planned ${String(parsed.meal_type ?? '')} on ${String(parsed.date ?? '')}`
  if (tr.name === 'clear_meal_slot')  return `Cleared ${String(parsed.meal_type ?? '')} on ${String(parsed.date ?? '')}`
  if (tr.name === 'add_recipe_ingredients_to_list') return `Added ${String(parsed.added ?? '')} ingredients to list`
  if (tr.name === 'search_recipes')   return 'Searched recipes'
  if (tr.name === 'suggest_meal_plan') return `Planned ${String((parsed.suggestions as unknown[])?.length ?? 0)} meals`
  if (tr.name === 'get_recipes')         return 'Checked your recipes'
  if (tr.name === 'create_recipe')       return `Saved recipe "${parsed.title ?? ''}"`
  if (tr.name === 'add_recipe_from_url') return `Saved recipe "${parsed.title ?? ''}"`
  if (tr.name === 'get_weather')              return `Checked weather for ${String(parsed.city ?? args.city ?? '')}`
  if (tr.name === 'get_school_children')      return 'Looked up children'
  if (tr.name === 'add_school_child')         return `Added child "${parsed.name ?? ''}"`
  if (tr.name === 'get_school_schedule')      return 'Checked school schedule'
  if (tr.name === 'set_school_schedule')      return parsed.cleared ? `Cleared ${String(args.day ?? '')} schedule` : `Set ${String(args.day ?? '')} hours`
  if (tr.name === 'get_school_lunches')       return 'Checked school lunches'
  if (tr.name === 'set_school_lunch')         return parsed.cleared ? `Cleared lunch for ${String(args.date ?? '')}` : `Set lunch for ${String(parsed.date ?? '')}`
  if (tr.name === 'get_school_assignments')   return 'Checked assignments'
  if (tr.name === 'add_school_assignment')    return `Added assignment "${parsed.title ?? ''}"`
  if (tr.name === 'update_school_assignment') return parsed.done === true ? `Marked "${parsed.title ?? ''}" done` : `Updated assignment`
  if (tr.name === 'delete_school_assignment') return 'Deleted assignment'
  return tr.name
}

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-5 px-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

export default function Chat() {
  const STORAGE_KEY = 'grove_chat_history'

  const { data: aiData, isLoading: modelsLoading } = useAiModels()
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? (JSON.parse(saved) as Message[]) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [model, setModel] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aiData?.default && !model) setModel(aiData.default)
  }, [aiData?.default])

  useEffect(() => {
    try {
      const toSave = messages.filter((m) => !m.loading)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch { /* storage full or unavailable */ }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    const history = messages
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', loading: true },
    ])

    setSending(true)
    try {
      const res = await pb.send('/api/grove/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text }],
          model,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: res.message || '',
          tool_results: (res.tool_results as ToolResult[]) || [],
        },
      ])
    } catch (err: unknown) {
      setMessages((prev) => prev.slice(0, -1))
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Something went wrong.'
      toast.error(msg)
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleNewConversation() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const modelSelect = aiData?.models?.length ? (
    <Select value={model} onValueChange={setModel}>
      <SelectTrigger className="h-7 text-xs w-[160px] border-border/60 bg-muted/40 focus:ring-0 gap-1">
        <span className="truncate">{model || 'Model'}</span>
      </SelectTrigger>
      <SelectContent>
        {aiData.models.map((m) => (
          <SelectItem key={m} value={m} className="text-xs font-mono">{m}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null

  const topBarActions = (
    <div className="flex items-center gap-1">
      {modelSelect}
      {messages.length > 0 && (
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNewConversation} aria-label="New conversation">
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  if (!modelsLoading && aiData && !aiData.enabled) {
    return (
      <>
        <TopBar title="Assistant" />
        <div className="flex flex-col items-center justify-center gap-4 text-center p-8 h-[calc(100dvh-7.5rem)] md:h-dvh">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">AI assistant not configured</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              An admin can configure the AI assistant under Admin → Settings.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Assistant" actions={topBarActions} />

      <div className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-dvh max-w-2xl mx-auto w-full">

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {modelSelect}
            {messages.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleNewConversation}>
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {messages.length === 0 && !modelsLoading && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Grove Assistant</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Ask me anything, or let me create lists, add items, and manage your calendar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "What's on my shopping list?",
                  "Add milk to my shopping list",
                  "What do I have today?",
                  "What assignments does Emma have?",
                  "Mark Emma's math homework as done",
                  "Set this week's lunches for Emma",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  {msg.tool_results?.map((tr, j) => {
                    let parsed: Record<string, unknown> = {}
                    try { parsed = JSON.parse(tr.result) } catch { /* empty */ }
                    const isError = !!parsed.error
                    return (
                      <span
                        key={j}
                        className={cn(
                          'inline-flex items-center gap-1 self-start text-[11px] font-medium px-2.5 py-1 rounded-full',
                          isError
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        {isError ? '✗' : '✓'} {toolLabel(tr)}
                      </span>
                    )
                  })}
                  <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-muted">
                    {msg.loading
                      ? <TypingDots />
                      : <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    }
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-primary text-primary-foreground">
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 md:px-6 py-3 border-t border-border shrink-0">
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend() }}
          >
            <Input
              ref={inputRef}
              placeholder="Message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
