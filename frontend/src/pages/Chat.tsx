import { useState, useRef, useEffect } from 'react'
import { Bot, Plus, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { mealLabel } from '@/lib/meals'
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

function toolLabel(tr: ToolResult, t: TFunction): string {
  let parsed: Record<string, unknown> = {}
  const args = tr.args as Record<string, unknown>
  try { parsed = JSON.parse(tr.result) } catch { /* empty */ }
  const str = (v: unknown) => String(v ?? '')
  if (parsed.error) return t('chat.tool.failed', { name: tr.name })
  switch (tr.name) {
    case 'get_members':
    case 'get_lists':
    case 'get_list_items':
    case 'delete_list_item':
    case 'get_upcoming_events':
    case 'delete_event':
    case 'archive_list':
    case 'delete_list':
    case 'get_meal_plan':
    case 'search_recipes':
    case 'get_recipes':
    case 'get_school_children':
    case 'get_school_schedule':
    case 'get_school_lunches':
    case 'get_school_assignments':
    case 'delete_school_assignment':
      return t(`chat.tool.${tr.name}`)
    case 'create_list':
    case 'update_list':
      return t(`chat.tool.${tr.name}`, { name: str(parsed.name) })
    case 'add_list_item':
      return t('chat.tool.add_list_item', { text: str(parsed.text) })
    case 'check_list_item':
      return parsed.checked ? t('chat.tool.check_list_item') : t('chat.tool.uncheck_list_item')
    case 'create_event':
    case 'update_event':
      return t(`chat.tool.${tr.name}`, { title: str(parsed.title) })
    case 'set_meal_plan':
    case 'clear_meal_slot':
      return t(`chat.tool.${tr.name}`, { meal: mealLabel(t, str(parsed.meal_type)), date: str(parsed.date) })
    case 'add_recipe_ingredients_to_list':
      return t('chat.tool.add_recipe_ingredients_to_list', { count: Number(parsed.added ?? 0) })
    case 'suggest_meal_plan':
      return t('chat.tool.suggest_meal_plan', { count: (parsed.suggestions as unknown[])?.length ?? 0 })
    case 'create_recipe':
    case 'add_recipe_from_url':
      return t('chat.tool.create_recipe', { title: str(parsed.title) })
    case 'get_weather':
      return t('chat.tool.get_weather', { city: str(parsed.city ?? args.city) })
    case 'add_school_child':
      return t('chat.tool.add_school_child', { name: str(parsed.name) })
    case 'set_school_schedule':
      return parsed.cleared
        ? t('chat.tool.clear_school_schedule', { day: str(args.day) })
        : t('chat.tool.set_school_schedule', { day: str(args.day) })
    case 'set_school_lunch':
      return parsed.cleared
        ? t('chat.tool.clear_school_lunch', { date: str(args.date) })
        : t('chat.tool.set_school_lunch', { date: str(parsed.date) })
    case 'add_school_assignment':
      return t('chat.tool.add_school_assignment', { title: str(parsed.title) })
    case 'update_school_assignment':
      return parsed.done === true
        ? t('chat.tool.done_school_assignment', { title: str(parsed.title) })
        : t('chat.tool.update_school_assignment')
    default:
      return tr.name
  }
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
  const { t } = useTranslation()
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
          : t('chat.error')
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
        <span className="truncate">{model || t('chat.model')}</span>
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
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNewConversation} aria-label={t('chat.newConversation')}>
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  if (!modelsLoading && aiData && !aiData.enabled) {
    return (
      <>
        <TopBar title={t('chat.title')} />
        <div className="flex flex-col items-center justify-center gap-4 text-center p-8 h-[calc(100dvh-7.5rem)] md:h-dvh">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Bot className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">{t('chat.notConfigured')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t('chat.notConfiguredHint')}
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title={t('chat.title')} actions={topBarActions} />

      <div className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-dvh max-w-2xl mx-auto w-full">

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">{t('chat.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            {modelSelect}
            {messages.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleNewConversation}>
                <Plus className="h-3.5 w-3.5" />
                {t('chat.new')}
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
                <p className="font-semibold">{t('chat.name')}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {t('chat.intro')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  t('chat.suggestion1'),
                  t('chat.suggestion2'),
                  t('chat.suggestion3'),
                  t('chat.suggestion4'),
                  t('chat.suggestion5'),
                  t('chat.suggestion6'),
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
                        {isError ? '✗' : '✓'} {toolLabel(tr, t)}
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
              placeholder={t('chat.messagePlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label={t('chat.send')}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
