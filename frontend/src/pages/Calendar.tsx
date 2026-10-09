import { useTranslation } from 'react-i18next'
import TopBar from '@/components/layout/TopBar'
import CalendarView from '@/components/calendar/CalendarView'

export default function Calendar() {
  const { t } = useTranslation()
  return (
    <>
      <TopBar title={t('nav.calendar')} />
      <CalendarView />
    </>
  )
}
