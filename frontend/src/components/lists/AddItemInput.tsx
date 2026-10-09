import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateListItem } from '@/hooks/useLists'

export default function AddItemInput({ listId }: { listId: string }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const createItem = useCreateListItem()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await createItem.mutateAsync({ listId, text: text.trim() })
      setText('')
    } catch {
      toast.error(t('lists.toast.itemAddFailed'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder={t('lists.addItemPlaceholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!text.trim() || createItem.isPending}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  )
}
