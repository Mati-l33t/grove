# Changelog

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

[0.2.0]: https://github.com/Mati-l33t/grove/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Mati-l33t/grove/releases/tag/v0.1.0
