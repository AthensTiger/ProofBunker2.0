# ProofBunker Release Notes — March 2–4, 2026

## Overview

This release covers approximately 36 hours of continuous development. Major themes: per-bottle detail tracking, a full mobile card redesign for the bunker list, social features (messaging + blog), Print Bunker PDF export, and numerous UX polish fixes.

---

## New Features

### Per-Bottle Detail Fields
Each physical bottle in your collection now carries its own detail record independent of the product entry. Fields tracked per bottle:

- **Batch Number** — e.g., "Batch 24"
- **Barrel Number** — single-barrel selections
- **Year Distilled** — when the spirit went into the barrel
- **Release Year** — when the bottle was released
- **Proof / ABV** — overrides the product-level value
- **Age Statement** — bottle-specific age override
- **Mash Bill** — grain recipe, if known

These override the product defaults (which still serve as fallbacks). The **Print Bunker** can now show or hide each of these fields individually per template.

### Bunker List — Mobile Card Redesign
The bunker list was fully rebuilt for mobile:

- **Card layout** replaces the old table, using virtualized rendering (react-virtuoso) for smooth scrolling on large collections
- **Per-field visibility toggles** — tap the gear icon to show/hide: Company, Spirit Type, ABV, Location, Rating, Notes, Details (batch/barrel/proof/age), and Bottle Image
- **Quick actions** — Open, Empty, and Delete buttons available directly on the card without navigating to the item detail page
- **"Multiple" button** — items with bottles in multiple locations or statuses show a smart "Multiple" button instead of a single action
- **Filter persistence** — active filters (status, location, spirit type) are remembered in localStorage across sessions
- **Inline star rating** on the card, with instant visual feedback on tap

### Print Bunker — PDF Export
A new **Export PDF** button appears on the Print Bunker preview page:

- Captures the menu at US Letter paper width (8.5 × 11 in) regardless of device screen size
- Supports multi-page menus (long lists paginate automatically)
- **iOS Safari**: opens a blob URL in a new tab (native download dialog not supported on iOS)
- **Desktop**: triggers a direct PDF download

### Print Bunker — Filter Persistence
Filter rules set in the menu editor (status, location, spirit type) are now **saved with the template** and applied automatically when the preview is generated. Previously, filters were UI-only and ignored at preview time.

### Direct Messaging (Phase 1)
Users connected via bunker shares can now send direct messages:

- Conversation list with unread indicators
- Full message thread view with send box
- Real-time SSE notification delivery

### Community Blog / Posts (Phase 2)
A new **Posts** section allows users to publish articles or product reviews:

- **Rich text editor** (Tiptap) with bold, italic, headings, lists, blockquote, undo/redo
- **Draft → Submit for Review → Published** workflow
- **Curator/Admin approval queue** in the Admin panel
- Community feed shows published posts; click any post to expand in-line

### AI Research Button
The **Research** button (powered by Claude + Brave Search) is now available in:

- The product info section on the bottle detail page
- The bottle edit modal (all fields expanded)

Correctly returns ABV as a decimal fraction stored in the database, displayed as a percentage in the UI.

### Context-Sensitive Help Tooltips
Help icons appear throughout the add-bottle and batch-scan flows, surfacing tips inline without leaving the page.

### Camera Barcode Scanning
A camera-based barcode scanner is now available in the UPC lookup flow. The whiskey bottle empty state is also shown when the bunker is empty.

### Customer Support System
- **AI Chatbot** (floating bottom-right) for in-app help, powered by Claude
- **Support ticket submission** form with type categories (Bug, Enhancement, Question, Other)
- **Admin view** shows all tickets with AI analysis and suggested fix, accordion-style cards
- Ticket status management (Open → In Progress → Resolved → Closed) restricted to admin users

### What's New / Release Notes
A **What's New** entry point (bourbon bottle icon in the navbar) links to the release notes page.

### Per-User Feature Flags
Admin can now enable/disable specific features per user from the Admin panel.

### Print Bunker Logo Watermark
Upload a bunker logo or per-location logo in Settings. When **Show Logo Watermark** is enabled on a print template, the logo appears as a faint full-page watermark behind the menu content.

---

## Improvements

### Bunker List
- Settings (display toggles, column prefs) moved behind a **gear icon** to reduce visual clutter
- Added **Mash Bill**, **Description**, and **Notes** as optional card fields
- Image only shown on cards when an image actually exists for that product
- **Add Another Bottle** navigates to the add-bottle flow with the product pre-selected; returns to the item detail page after completion
- Bottles section moved **above** Your Notes on the item detail page
- Bottles sorted by location then status on the detail page
- Browser tab title updated to show "My Bunker"
- **Delete from edit modal** — bottle can be deleted directly inside the edit sheet without a separate confirmation step

### Add Bottle Flow
- Form pre-populated with product data (proof, ABV, age statement, mash bill) when a product is selected
- Bottle-specific detail fields (batch, barrel, year distilled, release year) available at add time
- Last-used location remembered and pre-selected on next add

### Navigation & Branding
- ProofBunker logo added to navbar, loading screen, sign-in screen, and browser favicon
- "Bunker" nav link renamed to **"My Bunker"**
- "Menu Builder" renamed to **"Print Bunker"** with a feature description above the template list
- Nav links reordered; Settings replaced with a **gear icon**
- What's New nav link replaced with a **bourbon bottle icon**

### Email Verification Gate
New users must verify their email before accessing the app. The gate is DB-driven (no Auth0 changes required) and shows a clear verification prompt with re-send option.

---

## Bug Fixes

| Area | Fix |
|------|-----|
| Auth0 | Fixed incorrect tenant domain and client ID causing login failures |
| Auth0 | Removed page reload on 401 response that caused infinite login loops |
| iOS Safari | Fixed keyboard suppression on all text inputs |
| Print Bunker | Filters (location, status, spirit type) now apply correctly at preview time |
| Print Bunker PDF | Blank PDF resolved — element rendered in-place at 816 px before capture |
| Print Bunker PDF | PDF now renders at US Letter width regardless of screen size |
| ABV Display | Fixed ABV showing as fraction (e.g., 0.45) instead of percentage (45%) |
| ABV Research | Research results now return ABV as decimal fraction (not ×100) |
| Add Another Bottle | Route corrected from `/add` to `/add-bottle` |
| Add Another Bottle | Detail page now refreshes correctly after adding |
| Shared Bunker | Owner name no longer shows as "Anonymous" |
| Filter Persistence | Bunker list filters now persist across sessions via localStorage |
| Posts | Submitted and published posts can now be edited |
| Notifications | Notifications table migration conflict resolved |

---

## UI Polish

- **Product images** — all thumbnail images now anchor to the **right edge** when the image is wider than the container (`object-right`), ensuring the label/brand area is visible
- **Star rating** — clicking the currently-selected star now instantly clears to zero stars; hover state is cleared on click to prevent visual confusion
- **Support tickets** — admin ticket list redesigned as mobile-friendly accordion cards (collapsed header, expand to see details and AI analysis)
- **Mobile layout** — improved padding and layout for narrow iPhone screens (≤375 px wide)
- **Bottle photo fallback** — shows a placeholder when no photo is attached
- **Spirit subtype** shown in the bunker list alongside spirit type

---

*Released: March 4, 2026*
