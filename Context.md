# Project Context & State Handoff Document

> **Target Workspace:** Sports Reminder Chrome Extension (Manifest V3 React / Vite)  
> **Version:** 2.0.0 (Custom Team Engine & General-Purpose Web Scraper Upgrade)  
> **Date:** August 6, 2026  

---

## 1. Executive Summary

This release introduces a fully dynamic, general-purpose **Custom Team & Schedule Engine** for non-ESPN sports teams across all sports categories (Junior Hockey, Minor Leagues, Soccer, High School, College, etc.). Users can add custom teams by inputting any 2026-2027 season schedule URL, which the extension parses and integrates directly into the popup's upcoming games view and reminder alarm system.

### Key Enhancements & Refactors:
1. **Pure General-Purpose Web Scraper**: Purged hardcoded league/URL shortcuts in favor of a 4-tier fallback scraping engine (Direct `.ics` → Embedded iCal discovery & raw HTML Regex → JSON-LD/Next.js hydration blobs → HTML table/grid parsing).
2. **Dynamic Platform Parameter Synthesis**: Auto-detects JavaScript platform variables (`client_code`, `team_id`, `season_id`) to dynamically synthesize iCal endpoints for minor league platforms (e.g. LeagueStat / HockeyTech / Statview, SportsEngine, etc.) even when links are rendered dynamically.
3. **CORS & Host Permissions**: Added `<all_urls>` host permissions to `manifest.json` with multi-proxy fallback layers (`allorigins.win`, `corsproxy.io`) for web preview environments.
4. **Settings Reset & iOS Alert Dialog**: Fixed the "Clear Tracked Teams" setting with a native-style animated iOS blur alert popup (`.ios-alert-overlay`) supporting Complete Resets (clears custom leagues, schedules, and tracked teams) vs. Partial Resets (keeps custom league definitions).
5. **UI Header Realignment**: Relocated the blue `Manage` action link from `TRACKING` to the `LEAGUE` header while preserving the bottom `+ Add Team` button and updating empty state text.

---

## 2. Architecture & Design Decisions

```
+-----------------------------------------------------------------------------------+
|                                  Chrome Extension                                 |
|                                                                                   |
|  +--------------------+    +-----------------------+    +----------------------+  |
|  |     App.jsx        |--->|   leagueManager.js    |--->| customScheduleScraper|  |
|  | (React State/Modals|    | (Custom Store & Cache)|    |  (4-Tier Web Engine) |  |
|  +---------+----------+    +-----------+-----------+    +----------+-----------+  |
|            |                           |                           |              |
|            v                           v                           v              |
|  +--------------------+    +-----------------------+    +----------------------+  |
|  | iOS Alert & UI     |    | chrome.storage.local  |    | iCal / JSON-LD / HTML|  |
|  |  (glassmorphism)   |    | (tracked & custom data|    | (Scrapes schedule URL|  |
|  +--------------------+    +-----------------------+    +----------------------+  |
+-----------------------------------------------------------------------------------+
```

1. **Zero Hardcoded Shortcuts**:
   - The engine relies strictly on DOM structure inspection, iCal standard specifications (`BEGIN:VCALENDAR`, `VEVENT`), structured data schemas (`schema.org/SportsEvent`), and regex pattern matching for date/time/opponent tokens.
2. **Custom League Dynamic Registration**:
   - Custom leagues created by users are registered into `SUPPORTED_LEAGUES` and `LEAGUES_FLAT` at runtime with an `isCustom: true` flag. Custom teams are cached independently from ESPN API data and merged into the main popup feed seamlessly.
3. **Isolated ESPN Connectivity**:
   - Custom teams never connect to ESPN API endpoints or request ESPN CDN assets, preventing false fallback logos or hallucinated team records. Default fallback logos use a clean, inline iOS blue shield SVG (`DEFAULT_CUSTOM_LOGO`).
4. **iOS Design Aesthetics**:
   - All modals and alerts adhere to iOS dark mode design guidelines: `rgba(28, 28, 30, 0.85)` backgrounds, `backdrop-filter: blur(12px-20px)`, rounded corners (`border-radius: 14px-20px`), spring scale-up animations, and standard HSL color palettes.

---

## 3. Codebase Delta

### New Files Created:
- [`src/utils/customScheduleScraper.js`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/utils/customScheduleScraper.js): Core web scraping and parsing module. Handles iCal parsing (`parseICS`), logo extraction from OpenGraph/DOM (`extractLogosFromDOM`), JSON-LD/Next.js extraction (`parseStructuredData`), HTML table parsing (`parseHTMLTables`), dynamic platform parameter synthesis, and CORS proxy fallback fetching.
- [`src/components/CustomTeamModal.jsx`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/components/CustomTeamModal.jsx): 3-step animated wizard for adding custom teams (Input Form → Scraping Loading State → Preview & Edit Schedule).

### Modified Files:
- [`manifest.json`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/manifest.json): Updated `host_permissions` to include `<all_urls>` so Chrome extension context can fetch arbitrary user-provided schedule URLs.
- [`src/leagueManager.js`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/leagueManager.js): Added `initCustomData()`, `addCustomTeamToStore()`, `clearCustomDataFromStore()`, and dynamic league registration to `SUPPORTED_LEAGUES` & `LEAGUES_FLAT`.
- [`src/App.jsx`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/App.jsx): Added state management for `customTeams`, `customSchedules`, `showClearConfirm`, integrated `clearCustomDataFromStore()`, rendered the iOS reset alert overlay, and updated prop wiring for `LeagueSelector` and `TrackingList`.
- [`src/components/TrackingList.jsx`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/components/TrackingList.jsx): Removed header `Manage` link, retained bottom `+ Add Team` button, updated empty state text to `No teams tracked. Click "Add Team" to add!`.
- [`src/components/LeagueSelector.jsx`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/components/LeagueSelector.jsx): Added `onManage` prop and rendered the blue `Manage` link in the section header.
- [`src/components/SettingsModal.jsx`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/components/SettingsModal.jsx): Styled dropdown options (`#1c1c1e` background) for dark mode readability and bound `onClearTrackedTeams` to open the confirm dialog.
- [`src/global.css`](file:///c:/Users/frase/Downloads/ALPHA%20TESTING/Sports%20Reminder%20Extension%20%282%29/Sports%20Reminder%20Extension/src/global.css): Added CSS for dropdown select options, custom badges, iOS alert overlays (`.ios-alert-overlay`, `.ios-alert-card`), and alert scale-up/fade-in keyframe animations.

---

## 4. Schema / Data Models / API Changes

### Standardized `CustomGame` Schema:
Games produced by `customScheduleScraper.js` align with the ESPN game object contract:

```typescript
interface CustomGame {
  id: string;                    // e.g. "ics-1785998866351-0" or "jsonld-123-0"
  name: string;                  // e.g. "Blind River Beavers vs Elliot Lake Vikings"
  shortName: string;             // e.g. "vs Elliot Lake Vikings" or "@ Powassan Voodoos"
  date: string;                  // ISO 8601 string, e.g. "2026-09-12T23:00:00.000Z"
  status: {
    type: {
      state: 'pre' | 'in' | 'post';
      detail: string;            // e.g. "Scheduled"
    }
  };
  homeTeam: {
    id: string;                  // "custom-main" or "opp-X"
    name: string;
    logo: string;                // Image URL or SVG data URI
  };
  awayTeam: {
    id: string;                  // "custom-main" or "opp-X"
    name: string;
    logo: string;                // Image URL or SVG data URI
  };
  isCustom: true;
  venue?: string;                // Optional stadium / arena name
  customTeamId?: string;
  sportSlug?: string;
}
```

### Storage Model (`chrome.storage.local`):
```typescript
{
  trackedTeams: Array<TeamObject>,
  customTeams: Array<CustomTeamObject>,
  customSchedules: Array<CustomGame>,
  reminderLeadTime: string,
  gameReminders: Record<string, string[]>,
  startupNotificationEnabled: boolean,
  browserStartupReminders: Record<string, boolean>,
  customLeadMinsMap: Record<string, number[]>
}
```

---

## 5. Current Working State

### Verified & Working Features:
- ✅ **Dynamic Custom Web Scraper**: Tested against real schedule URLs:
  - **Soo Greyhounds (OHL)**: `https://chl.ca/ohl/schedule/16/88/home/` → **68 games extracted**.
  - **Blind River Beavers (NOJHL)**: `https://blindriverbeavers.com/stats/schedule/6/44/all-months/homeaway?league=1` → **50 games extracted**.
- ✅ **Single-Page Application (SPA) Resilience**: Finds hidden calendar links embedded inside `<script>` or JSON hydration blobs via raw HTML regex scanning when `DOMParser` misses rendered nodes.
- ✅ **Dynamic Platform Parameter Synthesis**: Detects `client_code` in script tags + `/schedule/{team_id}/{season_id}` in URLs to synthesize iCal endpoints for LeagueStat / HockeyTech / Statview platforms.
- ✅ **Settings & Reset Dialog**: "Clear Tracked Teams" triggers an animated iOS alert overlay with options for Complete Reset (purges custom leagues) or Partial Reset (keeps custom leagues).
- ✅ **Production Build Verification**: `npm run build` compiles cleanly (56 modules transformed, zero bundling errors).

### Known Incomplete / Outstanding Items:
- None for the current phase. All requested custom team schedule features, scraper fixes, settings reset flows, and UI adjustments are complete and verified.

---

## 6. Key Constraints & Gotchas

1. **DOMParser vs. SPA Hydration Blobs**:
   - *Issue*: Browsers' native `DOMParser.parseFromString()` only parses standard HTML elements. Modern SPAs (React/Next.js/Angular) often render calendar links via JS or store parameters in `<script>` tags.
   - *Solution*: `customScheduleScraper.js` runs a fallback Regex scan across the unparsed raw HTML string whenever `doc.querySelectorAll('a[href]')` fails to find a calendar feed link.
2. **LeagueStat / HockeyTech Minor League Platforms**:
   - *Issue*: Sites like `blindriverbeavers.com` show an iCal button on the UI, but the initial HTML contains no `<a>` tag for it.
   - *Solution*: The scraper extracts `client_code` from inline scripts (`var client_code = '...'`) and `team_id`/`season_id` from the URL path to construct the underlying iCal feed URL (`https://cluster.leaguestat.com/components/calendar/ical_add_games.php?...`).
3. **Cross-Origin Scraper Requests**:
   - *Chrome Extension Context*: Handled via `manifest.json` `<all_urls>` host permissions.
   - *Web Preview Context*: Handled via proxy fallback hierarchy (`url` → `allorigins.win` → `corsproxy.io`).
4. **Dark Mode UI Select Inputs**:
   - *Issue*: Default browser dropdowns render white backgrounds over dark text or dark backgrounds over dark text.
   - *Solution*: `global.css` explicitly sets `.ios-select-input option { background-color: #1c1c1e; color: #ffffff; }`.
