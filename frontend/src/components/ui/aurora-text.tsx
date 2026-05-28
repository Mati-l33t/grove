import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s))
  l = Math.max(0, Math.min(100, l))
  const sl = s / 100
  const ll = l / 100
  const a = sl * Math.min(ll, 1 - ll)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function buildAuroraColors(hex: string): string[] {
  const [h, s, l] = hexToHsl(hex)
  return [
    hslToHex(h, s, l),
    hslToHex(h + 30, s, Math.min(l + 18, 85)),
    hslToHex(h + 60, Math.max(s - 10, 40), l),
    hslToHex(h - 25, s, Math.min(l + 12, 80)),
    hslToHex(h, s, l),
  ]
}

interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors: string[]
  speed?: number
}

export function AuroraText({ children, className, colors, speed = 8 }: AuroraTextProps) {
  return (
    <span
      className={cn('relative inline-block', className)}
      style={
        {
          backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          '--aurora-speed': `${speed}s`,
          animation: 'aurora-shift var(--aurora-speed) linear infinite',
        } as CSSProperties
      }
    >
      {children}
    </span>
  )
}
