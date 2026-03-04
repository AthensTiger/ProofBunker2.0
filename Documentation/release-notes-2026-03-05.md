# ProofBunker Release Notes — March 5, 2026

## Overview

This release focuses on search quality, Print Bunker organization, UI navigation polish, and admin/settings improvements.

---

## New Features

### Fuzzy Search
Both search surfaces now support approximate/typo-tolerant matching:

- **Bunker list** — powered by [Fuse.js](https://fusejs.io/), searches across bottle name, company name, and spirit type. Handles misspellings and partial words (e.g., "bufflo trace" → Buffalo Trace).
- **Add Bottle autocomplete** — backend now uses PostgreSQL trigram similarity (`pg_trgm`). Results match against both product name and company name, ranked by relevance. Fuzzy matches (e.g., "maekrs mark") surface alongside exact substring matches.

### Print Bunker — Group by Location
A new **Group by Location** toggle is available in print template Display Options:

- When **enabled**, the preview and print output groups bottles by storage location name instead of spirit type. Each location becomes a section header (e.g., "Bar Cart", "Basement Rack").
- When **disabled** (default), the existing spirit-type grouping is used.
- Items within each section now always sort by **Type → Subtype → Name** for consistent organization.

---

## Improvements

### Support Ticket Sorting
The admin Support Tickets tab now sorts by status priority first, then by date received (oldest first within each group):

1. In Progress
2. Open
3. Resolved
4. Closed

### Logo Removal
Settings now includes **Remove Logo** buttons for both the bunker logo and individual storage location logos. Previously it was possible to upload or replace a logo but not delete it entirely.

### Curator Dashboard Title
The admin panel now shows **"Curator Dashboard"** as the page title when the logged-in user has the Curator role, instead of the generic "Admin Dashboard". Admins continue to see "Admin Dashboard".

### Print Bunker — Improved Item Sort
Even without Group by Location enabled, items within each spirit-type section now sort by **Type → Subtype → Name** (previously name-only). This keeps related sub-types together — e.g., all Single Malt entries before Blended within a Whiskey section.

---

## UI Polish

### Sticky Navbar
The top navigation bar is now **sticky** — it remains fixed at the top of the viewport as you scroll, so navigation is always accessible without scrolling back to the top.

### Sticky Page Headers
On pages with scrollable content lists, the **page heading and controls remain pinned** just below the navbar while only the card/list area scrolls. Applied to:

- **My Bunker** — heading + search/filter row stays visible
- **Admin** — heading + tab strip stays visible
- **Posts** — heading + tab strip stays visible

### Mobile Menu Cleanup
The **"What's New"** item has been removed from the mobile dropdown menu. The bourbon bottle icon already in the top navbar bar provides the same navigation, making the dropdown entry redundant.

---

*Released: March 5, 2026*
