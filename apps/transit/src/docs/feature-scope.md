Transit App — Simplified Feature Scope


Product Summary
Transit helps people plan, navigate, and track city transit with clear, real‑time information across bus, subway, and train.

Goals
- Reduce time to find a good route.
- Make arrivals, service alerts, and transfers easy to understand.
- Keep a lightweight, responsive UX that works well offline with cached data.

User Roles
- Anonymous user: browse public info, plan trips.
- Authenticated user: save routes and preferences.

Core Features (V1)
1) Plan Trip
- Inputs: origin, destination, depart/arrive time, preferred modes.
- Output: list of Trip Options with duration, transfers, fare, walking.
- Actions: search, swap origin/destination, use current location, pick option.

2) Search Results
- Sort: fastest, fewest transfers, earliest arrival.
- Filters: mode (bus, subway, train).
- Preview: walking segments, total fare, transfer count.

3) Trip Details
- Step-by-step journey: walk, wait, ride segments.
- Line/stop details per step.
- Save route.

4) Nearby
- List/map of nearby stops with next arrivals.
- Filter by mode.
- Open Stop Details.

5) Stop Details
- Real-time arrivals across lines.
- Facilities/amenities/accessibility.
- Open in maps / directions to stop.

6) Saved Routes
- Save, list, and quick-start navigation for frequent trips.
- Edit/Delete saved routes.

7) Profile & Preferences
- Home/Work stops.
- Preferred modes, language, notifications.

8) Service Alerts
- Active alerts by severity.
- Affected lines/stops and suggested alternatives.

Information Architecture (High-Level)
- Tabs (suggested): Plan, Nearby, Saved, Profile.
- Drill-down: Plan → Results → Trip Details; Nearby → Stop Details; Saved → Trip Details.

Data Model (from referecejsom.md)
- Areas (AREAS): city regions for grouping stops.
- Stops (STOPS): id, name, area, location, modes, facilities, amenities, accessibility, platforms.
- Lines (LINES): id, name, shortName, mode, color, hours, status, stops, alerts.
- Service Alerts (SERVICE_ALERTS): id, severity, title, description, affectedLines, affectedStops, icon, alternatives.
- Trip Options (TRIP_OPTIONS): id, origin/destination stops, summary, times, duration, fare, transfers, walking, steps.
- Saved Routes (SAVED_ROUTES): id, name, origin/destination, preferredMode, reminders.
- Recent Searches (RECENT_SEARCHES): simple history for quick starts.
- Profile Preferences (PROFILE_PREFERENCES): home/work, preferredModes, language, notifications.
- Constants: HOME_STOP_ID.

MVP Scope (Ship First)
- Plan Trip (search, results, trip details).
- Nearby (list view) with next 3 arrivals per stop.
- Stop Details (arrivals + basics).
- Saved Routes (save, list, delete).
- Service Alerts (read-only list).
- Profile Preferences (home/work, modes, language).

Defer/Post‑MVP
- Map view for Nearby and Trip Details.
- Schedules/timetables and printable views.
- Advanced notifications (departures, background updates).
- Multi-city datasets.

UX/Design Notes
- Emphasize clarity for duration, transfers, and arrivals.
- Use consistent colors per transit mode/line.
- Accessibility: large tap targets, high contrast, screen reader labels.

Performance & Offline
- Cache recent searches, saved routes, and static network data.
- Incremental refresh for arrivals and service alerts.

Navigation & Deep Links
- plan?from=…&to=…&time=…&mode=…
- stop/:id, line/:id, trip/:id

Security & Privacy
- Store only necessary user data (saved routes, preferences).
- No sensitive PII beyond account basics for auth.


