# What's New — March 2026

## Overview

This release represents a major expansion of Proof Bunker with 15+ new features across collection management, social tools, print capabilities, and UX polish. Here's everything that's new.

---

## New Features

### Per-Bottle Detail Tracking
Each physical bottle in your collection now carries its own detail record independent of the product entry. Track these fields per bottle, not just per product:

- **Batch Number** — e.g., "Batch 24"
- **Barrel Number** — single-barrel selections
- **Year Distilled** — when the spirit went into the barrel
- **Release Year** — when the bottle was released
- **Proof / ABV** — overrides the product-level value for that specific bottle
- **Age Statement** — bottle-specific age override
- **Mash Bill** — grain recipe, if known for this release

These override product defaults, which still serve as fallbacks when no bottle-level value is set.

### Bunker List — New Card Layout
The bunker list has been fully rebuilt for modern devices:

- **Card layout** with virtualized rendering for smooth scrolling on large collections
- **Per-field visibility toggles** — use the gear icon to show/hide: Company, Spirit Type, ABV, Mash Bill, Location, Status, Rating, Notes, Description, and Bottle Image
- **Quick actions** — Open, Empty, and Delete available directly on the card
- **Inline star rating** with instant visual feedback
- **Smart "Multiple" button** for items spanning multiple locations or statuses
- **Filter persistence** — status, location, and spirit type filters remember your choices across sessions
- **Fuzzy search** — the search bar now handles misspellings and partial words (e.g., "bufflo trace" → Buffalo Trace)

### Fuzzy Product Search
Finding bottles is now more forgiving across the app:

- **Bunker list search** uses Fuse.js for typo-tolerant, approximate matching
- **Add Bottle autocomplete** uses PostgreSQL trigram similarity — finds matches even with misspelled names, and also searches company names

### Print Bunker — New Capabilities
Several enhancements to the Print Bunker (menu builder):

- **PDF Export** — new Export PDF button captures your menu at US Letter size, supports multi-page output. On desktop, downloads directly. On iOS, opens in a new tab.
- **Group by Location** — new toggle to organize your print menu by storage location instead of spirit type. Each location becomes a named section header.
- **Improved sort order** — items within each section now sort by Type → Subtype → Name for consistent organization
- **Filter persistence** — status, location, and spirit type filters set in the editor are saved with the template and applied automatically at preview time
- **Per-bottle fields on menus** — show/hide Batch Number, Barrel Number, Year Distilled, Release Year, Proof, and Mash Bill independently per template

### Print Bunker — Logo Watermark
Upload a logo in Settings and display it as a faint full-page watermark on your printed menus:

- **Bunker logo** — appears on all templates when enabled
- **Per-location logo** — if all items in a template come from the same storage location and that location has a logo, it takes precedence
- Toggle **Show Logo Watermark** per template in Display Options

### Direct Messaging
Users connected via bunker shares can now message each other directly:

- Conversation list with unread indicators in the navbar
- Full message thread view with scrollable history and send box
- Real-time delivery via Server-Sent Events (SSE)

### Community Blog / Posts
A new **Posts** section for sharing knowledge and reviews:

- **Rich text editor** (bold, italic, headings H1/H2, bullet lists, numbered lists, blockquote, undo/redo)
- **Draft → Submit for Review → Published** workflow
- **Curator/Admin approval queue** in the Admin panel
- Community feed shows all published posts; click any post to expand in-place

### AI Research Button
Tap **Research** on any bottle detail page or edit modal to automatically look up and pre-fill product details using Claude + Brave Search. Returns ABV as a percentage correctly.

### Camera Barcode Scanning
Use your device camera to scan bottle barcodes directly in the UPC lookup flow — no manual entry needed.

### Customer Support System
Built-in help and ticketing:

- **AI Chatbot** (floating button, bottom-right) for instant in-app help powered by Claude
- **Submit a Ticket** form with category types: Bug, Enhancement, Question, Other
- **Admin ticket view** with AI analysis and suggested fix per ticket
- Status workflow: Open → In Progress → Resolved → Closed

### Per-User Feature Flags
Admins can now enable or disable specific features (Messages, Posts) on a per-user basis from the Admin panel.

---

## Improvements

### Add Bottle Flow
- Product form pre-populated with known values (proof, ABV, age statement, mash bill) when a product is selected
- Bottle-specific fields (batch, barrel, year distilled, release year) available at add time
- Last-used location remembered and pre-selected for the next add
- **Add Another Bottle** on the item detail page navigates directly to the add flow with the product pre-selected, then returns to the detail page on completion

### Settings — Logo Management
- Upload a bunker logo or per-location logo from the Settings page
- **Remove Logo** buttons added for both the bunker logo and individual location logos (previously upload-only)

### Admin Panel
- Support tickets now sort by status priority (In Progress → Open → Resolved → Closed), then by date received oldest-first
- Admin page title shows **"Curator Dashboard"** for users with the Curator role

### Navigation
- ProofBunker logo in navbar, loading screen, sign-in screen, and browser favicon
- Navbar is now **sticky** — stays fixed at the top as you scroll
- **Sticky page headers** on My Bunker, Admin, and Posts — heading and controls stay pinned while the content list scrolls
- "Menu Builder" renamed to **Print Bunker**
- Settings replaced with a **gear icon**
- What's New replaced with a **bourbon bottle icon** with unread badge
- Mobile dropdown menu cleaned up — redundant items removed

### Email Verification Gate
New users must verify their email before accessing the app. The gate is database-driven with a clear prompt and re-send option.

---

## Bug Fixes

| Area | Fix |
|------|-----|
| iOS Safari | Fixed keyboard suppression on all text inputs |
| Print Bunker | Filters now apply correctly at preview time |
| Print Bunker PDF | Fixed blank PDF; element now renders at 816 px before capture |
| ABV Display | Fixed ABV showing as fraction (0.45) instead of percentage (45%) |
| Add Bottle | "Add Another Bottle" route and detail page refresh fixed |
| Shared Bunker | Owner name no longer shows as "Anonymous" |
| Posts | Submitted and published posts can now be edited |

---

*March 2026*
