# What's New — March 2026

## March 5, 2026 Updates

### Support Ticket Lifecycle
The support system now has a full resolution workflow:

- **Email on Resolve** — when an admin marks your ticket as Resolved, you receive an email from noreply@proofbunker.com with a link back to the Support page
- **7-Day Auto-Close** — resolved tickets automatically close after 7 days if no action is taken; you'll receive an email when this happens
- **Reopen a Ticket** — if your issue isn't actually resolved, expand the ticket and click "Still need help? Reopen this ticket →", add a note explaining what still needs attention, and the ticket returns to In Progress
- **Admin Force-Close** — admins can close any ticket immediately from the status dropdown

### Unknown Barcodes — Resolve Flow & Photo Lightbox
Scanned barcodes that aren't in the product database are now much easier to handle:

- **Photo lightbox** on the Unknown Barcodes page — tap any photo thumbnail to open a full-size view with navigation between photos
- **Resolve inline** — search for a matching product directly on the Unknown Barcodes page and add the bottle to your bunker without leaving the page
- **Photo capture in batch scan** — unknown barcodes discovered during batch entry now let you snap up to 2 photos right from the scan session

### Print Bunker — Nested Grouping
When grouping by location, items now nest further into **Spirit Type → Subtype** within each location section. Subtype header color matches the spirit type color for visual consistency.

---

## March 4, 2026 Updates

### Improvements
- **Proof display** — values like 95.00000000001 now display cleanly as 95, 109.3 as 109.3, etc. Applied everywhere proof is shown or edited
- **Camera scanning** — zoom hint applied at startup, reducing the lens-switching delay that caused missed scans on multi-camera iPhones
- **Star ratings** — clicking a star now updates instantly with no lingering hover highlight
- **Product images** — right-aligned in the bunker list card so the label text stays on the left where it's easiest to read
- **Chatbot** — repositioned so it no longer overlaps the bottom navigation on mobile

### Bug Fixes

| Area | Fix |
|------|-----|
| iOS Chrome | Fixed login loop caused by Auth0 loading timeout on Chrome for iPhone |
| Print Bunker | Fixed "Menu not found" error on templates after recent grouping changes |
| Unknown Barcodes | Fixed batch scan incorrectly routing unknown barcodes |
| Navigation | Deleting a bottle now stays on the correct page instead of redirecting unexpectedly |

---

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
