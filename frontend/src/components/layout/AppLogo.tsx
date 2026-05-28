import { Leaf } from 'lucide-react'
import pb from '@/lib/pb'
import { useInstanceSettings } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'

interface AppLogoProps {
  className?: string
}

export default function AppLogo({ className }: AppLogoProps) {
  const { data: settings } = useInstanceSettings()

  if (settings?.logo) {
    return (
      <img
        src={pb.files.getUrl(settings as never, settings.logo)}
        alt=""
        aria-hidden="true"
        className={cn('object-contain shrink-0', className)}
      />
    )
  }

  return <Leaf className={cn('text-primary shrink-0', className)} />
}
