import { useTranslation } from 'react-i18next'
import { LANGUAGES, applyLanguagePreference } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export default function LanguageSwitch({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'en'
  return (
    <div className={cn('flex items-center justify-center gap-2 text-xs', className)} role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground/40">·</span>}
          <button
            type="button"
            onClick={() => applyLanguagePreference(l.code)}
            className={cn(
              'transition-colors hover:text-foreground',
              current === l.code ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}
            lang={l.code}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  )
}
