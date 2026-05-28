import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

import clearDay      from '@meteocons/svg/fill/clear-day.svg'
import clearNight    from '@meteocons/svg/fill/clear-night.svg'
import partlyDay     from '@meteocons/svg/fill/partly-cloudy-day.svg'
import partlyNight   from '@meteocons/svg/fill/partly-cloudy-night.svg'
import overcast      from '@meteocons/svg/fill/overcast.svg'
import fogDay        from '@meteocons/svg/fill/fog-day.svg'
import fogNight      from '@meteocons/svg/fill/fog-night.svg'
import drizzle       from '@meteocons/svg/fill/drizzle.svg'
import sleet         from '@meteocons/svg/fill/sleet.svg'
import rain          from '@meteocons/svg/fill/rain.svg'
import snow          from '@meteocons/svg/fill/snow.svg'
import stormDay      from '@meteocons/svg/fill/thunderstorms-day.svg'
import stormNight    from '@meteocons/svg/fill/thunderstorms-night.svg'

interface WeatherData {
  temp: number
  icon: string
  description: string
}

function isDay() {
  const h = new Date().getHours()
  return h >= 6 && h < 20
}

function wmoToWeather(code: number, day: boolean): { icon: string; description: string } {
  if (code === 0)   return { icon: day ? clearDay  : clearNight,  description: 'Clear sky' }
  if (code <= 2)    return { icon: day ? partlyDay : partlyNight, description: 'Partly cloudy' }
  if (code === 3)   return { icon: overcast,                      description: 'Overcast' }
  if (code <= 48)   return { icon: day ? fogDay    : fogNight,    description: 'Foggy' }
  if (code <= 55)   return { icon: drizzle,                       description: 'Drizzle' }
  if (code <= 65)   return { icon: rain,                          description: 'Rain' }
  if (code <= 67)   return { icon: sleet,                         description: 'Freezing rain' }
  if (code <= 77)   return { icon: snow,                          description: 'Snow' }
  if (code <= 82)   return { icon: rain,                          description: 'Showers' }
  if (code <= 86)   return { icon: snow,                          description: 'Snow showers' }
  return                   { icon: day ? stormDay  : stormNight,  description: 'Thunderstorm' }
}

function fetchWeather(unit: string): Promise<WeatherData | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weather_code&temperature_unit=${unit}`
          )
          if (!res.ok) { resolve(null); return }
          const data = await res.json()
          const temp = Math.round(data.current.temperature_2m)
          const code = data.current.weather_code
          resolve({ temp, ...wmoToWeather(code, isDay()) })
        } catch {
          resolve(null)
        }
      },
      () => resolve(null)
    )
  })
}

interface Props {
  compact?: boolean
}

export default function WeatherWidget({ compact = false }: Props) {
  const { user } = useAuthStore()
  const unit = user?.weather_unit ?? 'celsius'

  const { data: weather, isLoading } = useQuery({
    queryKey: ['weather', unit],
    queryFn: () => fetchWeather(unit),
    enabled: !!user?.show_weather,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  if (!user?.show_weather) return null

  const symbol = unit === 'fahrenheit' ? '°F' : '°C'

  if (isLoading) {
    return compact ? (
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-7 h-7 shrink-0 rounded-full bg-muted animate-pulse" />
        <div className="h-3.5 w-8 rounded bg-muted animate-pulse" />
      </div>
    ) : (
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-14 h-14 shrink-0 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-5 w-12 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (!weather) return null

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 shrink-0 select-none" aria-label={`${weather.temp}${symbol}, ${weather.description}`}>
        <img src={weather.icon} alt={weather.description} className="w-7 h-7 shrink-0" />
        <span className="text-sm font-semibold tabular-nums">{weather.temp}{symbol}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 shrink-0 select-none" aria-label={`${weather.temp}${symbol}, ${weather.description}`}>
      <img src={weather.icon} alt={weather.description} className="w-14 h-14 shrink-0" />
      <div className="text-right">
        <p className="text-xl font-semibold leading-none tabular-nums">{weather.temp}{symbol}</p>
        <p className="text-xs text-muted-foreground mt-1">{weather.description}</p>
      </div>
    </div>
  )
}
