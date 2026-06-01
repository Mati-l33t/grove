export type ShareMode = 'private' | 'household' | 'members'

export interface NotificationPrefs {
  push_event_assigned?: boolean
  push_list_assigned?: boolean
  push_list_item_added?: boolean
  push_recipe_shared?: boolean
  push_school_lunch?: boolean
  push_school_assignment?: boolean
  email_event_assigned?: boolean
  email_list_assigned?: boolean
  email_list_item_added?: boolean
  email_recipe_shared?: boolean
  email_school_lunch?: boolean
  email_school_assignment?: boolean
}

export interface UserPermissions {
  events?: boolean
  lists?: boolean
  recipes?: boolean
  meal_plan?: boolean
}

export interface User {
  id: string; email: string; username: string; name: string; avatar: string
  color: string; household: string; is_admin: boolean
  role?: 'adult' | 'child'
  permissions?: UserPermissions
  time_format?: '12h' | '24h'
  week_start?: 'monday' | 'sunday'
  show_weather?: boolean
  weather_unit?: 'celsius' | 'fahrenheit'
  notification_prefs?: NotificationPrefs
  created: string; updated: string
}
export interface Household {
  id: string; name: string; invite_code: string; owner: string
  expand?: { owner?: User }
}
export interface CalendarEvent {
  id: string; title: string; description: string; location: string
  start: string; end: string; all_day: boolean; color: string
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_end: string; reminder_minutes: number
  user: string; household: string; shared_with: string[]
  expand?: { user?: User }
}
export interface List {
  id: string; name: string; type: 'todo' | 'shopping'
  icon: string; color: string; user: string
  household: string; shared_with: string[]; archived: boolean
  assigned_to: string
  expand?: { user?: User; assigned_to?: User }
}
export interface ListItem {
  id: string; list: string; text: string
  checked: boolean; order: number; added_by: string
  expand?: { added_by?: User }
}
export interface Ingredient { amount: string; unit: string; name: string }
export interface Recipe {
  id: string; title: string; description: string
  ingredients: Ingredient[]; instructions: string
  prep_time: number; cook_time: number; servings: number
  image: string; tags: string[]; user: string; household: string; shared_with: string[]
  expand?: { user?: User }
}
export interface SmtpSettings {
  id: string
  enabled: boolean
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from_name: string
  from_address: string
}

export interface InstanceSettings {
  id: string
  app_name: string
  registration_open: boolean
  default_theme: 'dark' | 'light'
  logo?: string
  holidays_enabled?: boolean
  holiday_countries?: string[]
  holidays_last_imported?: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  local_name: string
  country_code: string
  year: number
}

export interface NagerCountry {
  countryCode: string
  name: string
}

export interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

export interface AdminUser extends User {
  created: string
  expand?: { household?: { id: string; name: string } }
}

export interface AiSettings {
  id: string
  enabled: boolean
  api_url: string
  api_key: string
  default_model: string
}

export interface MealPlan {
  id: string; date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipe: string; custom_meal: string; user: string; household: string; shared_with: string[]
  expand?: { recipe?: Recipe; user?: User }
}

export interface SchoolChild {
  id: string; name: string; school_name: string; grade: string; color: string
  user: string; household: string
  expand?: { user?: User }
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export interface SchoolSchedule {
  id: string; child: string; day: WeekDay
  start_time: string; end_time: string
  user: string; household: string
}

export interface SchoolLunch {
  id: string; child: string; date: string; meal: string
  user: string; household: string
}

export type AssignmentType = 'test' | 'homework' | 'project' | 'other'

export interface SchoolAssignment {
  id: string; child: string; subject: string; title: string
  type: AssignmentType; due_date: string; done: boolean; notes: string
  user: string; household: string
}
