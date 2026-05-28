import { cn } from '@/lib/utils'

interface DiaTextRevealProps {
  text: string
  colors?: string[]
  className?: string
}

export function DiaTextReveal({ text, colors = ['currentColor'], className }: DiaTextRevealProps) {
  return (
    <span className={cn('inline', className)} aria-label={text}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            color: colors[i % colors.length],
            animationName: 'dia-reveal',
            animationDuration: '0.55s',
            animationTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            animationFillMode: 'both',
            animationDelay: `${i * 55}ms`,
          }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </span>
  )
}
