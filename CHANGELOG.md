# Changelog

## [0.3.0] - 2026-10-09

### Added
- Multi-language support — the whole web interface is now translatable, with English and French included (the French translation is a first draft; corrections are welcome)
- Language setting under Settings → Profile, defaulting to your browser language, plus a language switch on the sign-in and registration pages
- Dates, month and weekday names, and times follow the selected language across the calendar, Today, meal plan and school pages
- Reminder emails, push notifications, welcome emails and the mail-server test email are sent in each user's chosen language
- `npm run check:locales` verifies translation files have matching keys and placeholders
- Translations section in the README explaining how to add a language

### Changed
- Event reminders and notification emails now escape special characters in titles and names
- Updated dependencies, including React Router (security fixes) and Nodemailer 10 (security fixes)

### Fixed
- Meal plan and Household pages now respect the "Week starts on" setting instead of always starting on Monday

## [0.2.0] - 2026-06-01

### Added
- Public holidays on the calendar — fetched from [Nager.Date](https://date.nager.at) and stored locally
- Admin setting to enable/disable holidays and select countries
- Import button to pull current and next year's holidays for selected countries
- Holidays display as red all-day events; clicking them does nothing (read-only)
- Today page shows today's holidays above the event list when holidays are enabled

### Fixed
- Time (00:00) no longer shown on all-day events in month and agenda views
- Creator always retains event visibility when assigning an event to another member

## [0.1.0] - 2025-06-02

### Added
- Initial public release
- Shared family calendar with per-member color coding, recurring events, and reminders
- To-do and shopping lists (personal and household-shared)
- Recipe storage with meal planner
- Today dashboard with agenda, list summaries, and meal plan
- Household system with invite codes
- PWA — installable on Android, iOS, tablet, and desktop
- Dark/light theme with system default
- In-app admin panel for user and instance management
- Web push notifications via VAPID
- AI-assisted recipe import
- Self-hosted on Proxmox LXC (Debian 12/13) or Docker
- PocketBase 0.39 backend with SQLite

[0.3.0]: https://github.com/Mati-l33t/grove/compare/v0.2.1...v0.3.0
[0.2.0]: https://github.com/Mati-l33t/grove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Mati-l33t/grove/releases/tag/v0.1.0
