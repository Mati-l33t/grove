# Grove — Technical Specification

---

## Feature Descriptions

### Today Dashboard (`/`)
The landing page after login. Shows:
- Greeting: "Good morning, [name]" based on time of day
- Today's date
- List of today's events (from calendar), sorted by time
- Quick summary of active lists (e.g. "Grocery list — 4 items remaining")
- Today's meal plan (breakfast/lunch/dinner if set)
- Floating action button (FAB) to quick-add a new event

### Calendar (`/calendar`)
Full calendar view powered by FullCalendar.
- Default view: month
- Toggle between month / week / day
- Events color-coded by household member (use their `color` field)
- Click empty slot → opens EventModal pre-filled with that date
- Click event → opens EventModal in edit mode
- EventModal fields: title, date/time, all-day toggle, color override, description, reminder, recurrence
- Household members' events shown alongside personal events
- Mini agenda list below calendar on mobile

### Lists (`/lists` and `/lists/:id`)
**Overview page:**
- Grid of list cards
- Card shows: name, icon, color accent, item count, unchecked count, shared badge if household list
- Filter tabs: All / To-do / Shopping
- Button to create new list

**List detail:**
- List name + icon in header
- Items with checkbox to mark complete
- Completed items shown at bottom, slightly faded
- Add item: text input at top, press Enter or tap + to add
- Long-press/swipe item to delete
- Share list via household toggle
- Email list button (opens mailto: with list contents)
- Archive list in settings/menu

### Recipes (`/recipes`)
**Grid view:**
- Recipe cards with image (placeholder if none), title, prep+cook time, tags
- Filter by tag
- Search by title

**Recipe detail (`/recipes/:id`):**
- Hero image
- Title, description, prep time, cook time, servings
- Ingredients list (formatted)
- Instructions (rendered as numbered steps)
- "Add ingredients to shopping list" button → opens list picker modal
- Edit button (if owner)

**Create/Edit form (`/recipes/new`, `/recipes/:id/edit`):**
- Title, description
- Image upload
- Prep time, cook time, servings
- Ingredients: dynamic rows (amount + unit + name), add/remove rows
- Instructions: textarea
- Tags: chip input

### Meal Planner (`/meal-plan`)
- Week view: columns Mon–Sun, rows Breakfast/Lunch/Dinner/Snack
- Each cell is a slot. If filled: shows recipe name or custom text
- Click empty slot → bottom sheet/modal: search recipes OR type custom text
- Click filled slot → options: view recipe / change / remove
- Week navigation: prev/next arrows + "This week" button
- "Add all this week's recipe ingredients to shopping list" button

### Settings (`/settings`)
- Profile: change name, upload avatar, change color (color picker for calendar)
- Theme: dark/light toggle
- Account: change email, change password, delete account
- Notifications: reminder preference (push if supported)

### Household Settings (`/settings/household`)
- If no household: prompt to create one (enter family name)
- If has household: show household name, invite code (large, copyable), list of members with avatars and colors
- Leave household button
- Owner can: rename household, remove members, regenerate invite code
- Join household: enter 6-char invite code

---

## TypeScript Types (src/types/index.ts)

```typescript
export interface User {
  id: string
  email: string
  name: string
  avatar: string
  color: string
  household: string // household id or empty string
  created: string
  updated: string
}

export interface Household {
  id: string
  name: string
  invite_code: string
  owner: string // user id
  expand?: {
    owner?: User
  }
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  start: string // ISO datetime
  end: string
  all_day: boolean
  color: string
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_end: string
  reminder_minutes: number
  user: string
  household: string
  expand?: {
    user?: User
  }
}

export interface List {
  id: string
  name: string
  type: 'todo' | 'shopping'
  icon: string
  color: string
  user: string
  household: string
  archived: boolean
  expand?: {
    user?: User
  }
}

export interface ListItem {
  id: string
  list: string
  text: string
  checked: boolean
  order: number
  added_by: string
  expand?: {
    added_by?: User
  }
}

export interface Ingredient {
  amount: string
  unit: string
  name: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: Ingredient[]
  instructions: string
  prep_time: number
  cook_time: number
  servings: number
  image: string
  tags: string[]
  user: string
  household: string
  expand?: {
    user?: User
  }
}

export interface MealPlan {
  id: string
  date: string // YYYY-MM-DD
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipe: string // recipe id or empty
  custom_meal: string
  user: string
  household: string
  expand?: {
    recipe?: Recipe
  }
}
```

---

## PocketBase API Rules

Configure these in PocketBase admin (http://localhost:8090/_/) after first run:

### users
- List/Search: authenticated users only
- View: authenticated users only
- Create: public (registration)
- Update: owner only (`@request.auth.id = id`)
- Delete: owner only

### households
- List: authenticated
- View: authenticated
- Create: authenticated
- Update: owner only (`@request.auth.id = owner`)
- Delete: owner only

### events
- List: `@request.auth.id != "" && (@record.user = @request.auth.id || @record.household = @request.auth.record.household)`
- View: same
- Create: authenticated
- Update: `@request.auth.id = user`
- Delete: `@request.auth.id = user`

### lists + list_items
Same pattern as events — own records or household records.

### recipes
Same pattern.

### meal_plans
Same pattern.

---

## Environment Variables

**frontend/.env.example**
```
VITE_PB_URL=http://localhost:8090
```

For production (when served from PocketBase itself), VITE_PB_URL can be omitted — defaults to `window.location.origin`.

---

## Build & Deploy

### Development
```bash
# Terminal 1 — run PocketBase
cd pb && ./pocketbase serve

# Terminal 2 — run Vite dev server
cd frontend && npm run dev
# Dev server at http://localhost:5173
# PocketBase API at http://localhost:8090
```

### Production build
```bash
cd frontend
npm run build
cp -r dist/* ../pb/pb_public/
# Now visit http://YOUR_LXC_IP:8090
```

### Systemd service (installed by install.sh)
```
/etc/systemd/system/grove.service
```

---

## Docker Setup

### docker-compose.yml
```yaml
services:
  grove:
    image: ghcr.io/mati-l33t/grove:latest
    container_name: grove
    ports:
      - "8090:8090"
    volumes:
      - ./grove-data:/pb/pb_data
    restart: unless-stopped
```

### Dockerfile (multi-stage)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM alpine:latest
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip \
    && unzip pocketbase_linux_amd64.zip \
    && rm pocketbase_linux_amd64.zip \
    && chmod +x pocketbase
COPY --from=builder /frontend/dist ./pb_public
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
```

---

## PWA Manifest (public/manifest.webmanifest)

```json
{
  "name": "Grove",
  "short_name": "Grove",
  "description": "Your family, growing together",
  "theme_color": "#18181b",
  "background_color": "#18181b",
  "display": "standalone",
  "orientation": "any",
  "scope": "/",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Design Tokens

### Colors (Tailwind + shadcn)
- Background dark: `zinc-950` (#09090b)
- Surface dark: `zinc-900` (#18181b)
- Border dark: `zinc-800`
- Primary accent: `emerald-500` (#22c55e) — the "grove green"
- Text primary: `zinc-50`
- Text muted: `zinc-400`

### Light mode
- Background: `white`
- Surface: `zinc-50`
- Border: `zinc-200`
- Primary accent: `emerald-600`

### Typography
- Font: System font stack (Inter if available via @fontsource/inter)
- Headings: font-semibold
- Body: font-normal

### Layout
- Sidebar width desktop: 240px
- Bottom nav height mobile: 64px
- Top bar height mobile: 56px
- Content max-width: 1200px
- Mobile breakpoint: < 768px (md in Tailwind)

---

## Sidebar Navigation Items

| Icon | Label | Route |
|---|---|---|
| Home | Today | / |
| Calendar | Calendar | /calendar |
| CheckSquare | Lists | /lists |
| ChefHat | Recipes | /recipes |
| UtensilsCrossed | Meal Plan | /meal-plan |
| Settings | Settings | /settings |

---

## NPM Packages to Install

```bash
# Core
npm install pocketbase
npm install react-router-dom
npm install @tanstack/react-query
npm install zustand
npm install date-fns

# Calendar
npm install @fullcalendar/core @fullcalendar/react
npm install @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# UI
npm install lucide-react
npm install sonner
npm install class-variance-authority clsx tailwind-merge
npm install @fontsource/inter

# PWA
npm install -D vite-plugin-pwa workbox-window

# shadcn peer deps (installed via shadcn CLI but listed for reference)
# @radix-ui/* packages auto-installed by shadcn add commands
```

### shadcn/ui Components to Add
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add drawer
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add skeleton
npx shadcn@latest add switch
npx shadcn@latest add textarea
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add command
npx shadcn@latest add tooltip
npx shadcn@latest add alert
npx shadcn@latest add progress
```
