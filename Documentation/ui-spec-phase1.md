# Proof Bunker 2.0 — Phase 1 UI Specification

## Overview

Phase 1 covers: Auth0 login with age gate, bunker (inventory) management with single and batch bottle entry (including live barcode scanning), sortable/filterable bunker list, export to Excel/PDF, restaurant-style menu template builder with preview/print/PDF, user settings with storage location management, and read-only bunker sharing with selected friends.

---

## Navigation

- **Top navigation bar**: Proof Bunker logo (left), nav links (Bunker, Menu Builder, Shared With Me, Settings), user avatar + sign-out (right)
- Style and theme TBD — no preference locked in yet

---

## Screen 1: Login + Age Gate

### Landing Page (unauthenticated)
- Full-screen branded page with Proof Bunker logo and tagline (e.g., "Your Premium Spirits Collection")
- Single **"Sign In"** button → triggers Auth0 Universal Login (email/password, social providers)
- No other navigation visible — everything is behind authentication

### Age Gate (first login only)
- Shown after Auth0 callback if `users.age_verified = false`
- Centered card: "You must be at least 21 years of age to use Proof Bunker"
- Two buttons:
  - **"I am 21 or older"** → sets `age_verified = true` server-side → redirect to Bunker List
  - **"I am under 21"** → shows "Sorry" message with sign-out link
- On subsequent logins, `age_verified = true` is already set → skip straight to Bunker List

### Behavior
- Unauthenticated access to any protected route redirects to this page
- First-time users get auto-created in the `users` table via `ensureUserExists` middleware

---

## Screen 2: Bunker List (Main Inventory)

The primary screen. Displays the user's entire spirits inventory.

### Action Row (below top nav)
- **"Add Bottle"** button → opens Single Entry (Screen 4)
- **"Batch Scan"** button → opens Batch Entry (Screen 5)
- **Search bar**: text search across product names
- **Filter dropdowns**: spirit type, storage location, sealed/opened status
- **Sort control**: dropdown for sort field (name, company, spirit type, location, status, rating) + ascending/descending toggle
- **Image toggle**: switch to show/hide product thumbnails in the list
- **Export button**: dropdown with "Export to Excel" / "Export to PDF" → opens Export dialog (Screen 8)

### List Table — Default View (one row per product)

| Column | Description |
|---|---|
| Image | Thumbnail (hidden by default). Shows master product image, or user's bottle photo if they have one |
| Name | Product name |
| Company | Brand owner / company name |
| Spirit Type | e.g., Whiskey, Tequila |
| Proof | Proof number |
| Rating | Personal rating as stars (1-5), or dash if unrated |
| Qty | Count of physical bottles (bunker_bottles) |
| Locations | Comma-separated distinct locations. If one, shows the name. If multiple, abbreviated list |
| Status | "Sealed", "Opened", or "Sealed, Opened" if mixed across bottles |
| Actions | Edit (→ Bunker Item Detail), Delete (confirmation dialog) |

### Indicators
- **Pending product**: small clock icon/badge if `approval_status = 'pending'`
- **Rejected product**: warning badge if `approval_status = 'rejected'`. Clicking explains the status and offers options (reassign to verified product, edit & resubmit, leave, or delete)

### Empty State
- Friendly message: "Your bunker is empty"
- Prominent **"Add Your First Bottle"** and **"Start Batch Scan"** buttons

### Pagination
- Load all items client-side with client-side filtering/sorting (most users < 500 items)
- If performance becomes an issue, switch to server-side pagination

### Preferences
- Sort field, sort direction, image toggle, and filter settings are persisted to `users.preferences` JSONB (server-side, survives across devices)

---

## Screen 3: Bunker Item Detail

Reached by clicking a row or the Edit action on the Bunker List.

### Top Section — Product Info (read-only, from master DB)
- Large product image (from `product_images`)
- Product name, company name, distillery name (if available)
- Spirit type / subtype, proof, ABV, age statement
- MSRP, barrel type, mash bill (if available)
- Description (if available)
- Reference ratings from `tasting_notes` (e.g., "Community: 4.2/5, Expert: 88/100")
- Approval status badge if pending/rejected

### Middle Section — User's Personal Info (editable)
- **Personal rating**: clickable 1-5 stars
- **Notes**: free-text field with save
- **Total quantity**: displayed count (derived from bottles below)

### Bottom Section — Individual Bottles (table or cards)

| # | Location | Status | Purchase Price | Photos | Actions |
|---|---|---|---|---|---|
| 1 | Kitchen Bar | Sealed | $45.99 | 2 photos (thumbnail) | Edit / Delete |
| 2 | Basement Rack | Opened | $42.00 | — | Edit / Delete |

- **"Add Another Bottle"** button at the bottom (adds another physical bottle of this same product)
- **Edit** on a bottle: inline expand or modal — change location (combo dropdown), status (sealed/opened toggle), price, manage photos (upload up to 5, reorder, delete)
- **Delete** on a bottle: confirmation. If it's the last bottle, ask if user wants to remove the bunker item entirely
- **Photos**: clicking a thumbnail opens a lightbox/gallery. User's bottle photos shown here. If no user photos, master product image shown in the top section instead.

### Navigation
- Back arrow or breadcrumb to return to Bunker List

---

## Screen 4: Add Bottle — Single Entry

Accessed from the "Add Bottle" button on the Bunker List.

### Step 1 — Find the Product

Two input methods:
- **Search by name**: text input with autocomplete dropdown. As user types, matching products shown (name, company, spirit type, thumbnail). Click to select.
- **Scan barcode**: button opens the live camera viewfinder. Once barcode detected, looks up in `product_upcs`. If found, auto-selects the product.
- **Manual barcode entry**: text field for typing a UPC. **Pressing Enter triggers the lookup immediately** (no separate search button needed).

**If barcode not found:**
- Message: "Product not found"
- **"Submit New Product"** button opens inline form:
  - Required fields: Company name, Distillery name, Product name, Spirit type (dropdown), ABV, UPC barcode (pre-filled from scan)
  - Optional fields: spirit subtype, proof, description, image upload
  - Submit creates product in `products` with `approval_status = 'pending'` and `submitted_by_user_id` set
  - Continues to Step 2

### Step 2 — Bottle Details

Product info shown as a confirmation header (image, name, company, proof).

Fields:
- **Storage location**: combo dropdown — type to filter existing locations or enter a new name → "Add this location?" prompt
- **Status**: sealed/opened toggle (default: sealed)
- **Purchase price**: optional dollar amount
- **Photos**: optional, upload up to 5

**"Add to Bunker"** button.

### After Adding
- Success confirmation with options: **"Add Another Bottle"** (back to Step 1) or **"Go to Bunker"** (back to list)
- If product already exists in user's bunker, a new `bunker_bottle` is added under the existing `bunker_item`. If it's a new product for them, both `bunker_item` and `bunker_bottle` are created.

---

## Screen 5: Add Bottle — Batch Entry

Accessed from the "Batch Scan" button on the Bunker List. Full screen.

### Setup Bar (top, sticky)
- **Input mode toggle**: Camera or Text Input
  - Camera: live viewfinder for visual barcode scanning
  - Text Input: focused text field for Bluetooth barcode scanners (scanner sends barcode + Enter) or manual typing
- **Location**: combo dropdown (same as single entry — type to match or create new)
- **Status**: sealed/opened toggle (default: sealed)
- Location and status apply to every bottle scanned in this session. Can be changed mid-batch.

### Main Area — Scan Zone

**Camera mode:**
- Live camera viewfinder (takes up a good portion of the screen)

**Text input mode:**
- Large focused text field. Enter key triggers lookup. Field auto-clears after each successful scan, ready for next.

**Feedback per scan:**
- **Found + added**: green flash/checkmark, brief toast showing product name. Bottle auto-added with pre-set location + status.
- **Already in bunker**: adds another `bunker_bottle` under the existing `bunker_item`. Toast: "Added another [product name]"
- **Not found**: amber flash, scan pauses. Inline new-product form appears (company, distillery, name, spirit type, ABV — UPC pre-filled). After submitting, product created as pending + added to bunker, scanning resumes.
- **Optional price prompt**: after a successful add, a brief optional price field appears. User can type a price and hit Enter, or scan the next bottle to skip.

### Running Tally (bottom, sticky)
- Count: "12 bottles added"
- Scrollable list of added bottles (most recent at top): product name, found/new indicator
- **Undo** link per entry to remove the last-added bottle

### Exit
- **"Done"** button → brief summary ("Added 12 bottles to your bunker") → return to Bunker List

---

## Screen 6: Menu Template Builder

Accessed from top navigation ("Menu Builder").

### Template List (landing view)
- All saved menu templates shown as cards: template name, last modified, bottle count
- **"Create New Template"** button
- Per card: Edit, Preview, Delete actions

### Template Editor (create/edit)

**Left Panel — Template Settings:**
- **Template name**: text field (e.g., "Party Menu")
- **Menu title**: printed at top of menu (e.g., "Mike's Spirit Collection")
- **Menu subtitle**: optional second line
- **Logo**: upload custom image (stored in R2)
- **Columns**: 1, 2, or 3 column layout
- **Sort order**: sort field dropdown (name, proof, age, rating, price) + ascending/descending
- **Display toggles**:
  - Show proof
  - Show age statement
  - Show description
  - Show personal rating
  - Show MSRP
  - Group by spirit type (sections with headers)

**Right Panel — Bottle Selection (filter-based):**
- **Locations**: multi-select dropdown (or "All")
- **Status**: sealed / opened / both
- **Spirit type**: multi-select dropdown (or "All")
- **Minimum rating**: 1-5 stars or "Any"
- **Proof range**: optional min/max
- **Age statement**: has age / any

Filtered results shown as a checklist below. User can manually uncheck individual items to exclude.

Per selected item:
- Optional **section override** text field (custom section name instead of spirit type)
- Drag handles or arrows to reorder within a section

**Bottom Bar:**
- **Save** button
- **Preview** button → opens Screen 7

---

## Screen 7: Menu Preview

Accessed from Preview button in template builder or directly from a template card.

### Layout — Restaurant Menu Style

**Header:**
- Custom logo (if uploaded), menu title, subtitle — centered, elegant typography

**Body (1, 2, or 3 columns as configured):**
- Grouped by spirit type (or custom section names if overridden)
- Section headers (e.g., "WHISKEY", "TEQUILA")
- Items listed in configured sort order:

```
Angel's Envy Rye Finished in Rum Casks     100 Proof  |  ★★★★
    Aged in Caribbean rum casks. Rich maple, vanilla,
    and toasted oak with a sweet, lingering finish.

Buffalo Trace Kentucky Straight Bourbon      90 Proof  |  12 Year
    Deep amber color with complex aromas of vanilla,
    toffee, and candied fruit.
```

- Each item: product name (bold), enabled fields (proof, age, rating, MSRP) on the right
- Description below in smaller text (if enabled and available)

**Footer (optional):** date, user's name

### Actions Bar (not printed)
- **Print** button → browser print with print-optimized CSS
- **Export PDF** button → server-side PDF generation matching the same layout
- **Back to Editor** button

---

## Screen 8: Export (Excel/PDF)

Accessed from the Export button on the Bunker List. Opens as a modal/dialog.

### Export Dialog
- **Format**: Excel (.xlsx) or PDF — radio buttons
- **Scope**: "Full Bunker" or "Current View" (respects current filters/sort)
- **Detail level**:
  - **Summary** (default): one row per product — name, company, spirit type, proof, age, qty, locations, status, rating, MSRP
  - **Detailed**: one row per physical bottle — individual location, status, purchase price
- **Include images**: checkbox (PDF only — embeds thumbnails)
- **"Export"** button → server-side generation → file download

### Excel Specifics
- Column headers matching displayed fields
- Auto-sized columns, formatted table with Excel filters enabled
- Flat table (best for sorting/filtering in Excel)

### PDF Specifics
- Clean tabular layout with Proof Bunker header/logo
- Landscape orientation
- Page numbers, generated date in footer

### Generation
- Server-side: Express endpoint receives filter/sort/scope parameters, queries data, generates file, returns as download

---

## Screen 9: Settings

Accessed from top navigation.

### Section 1 — Profile
- Display name (editable)
- Email (read-only, from Auth0)
- Avatar (from Auth0 or upload to R2)
- Sign out button

### Section 2 — Bunker Preferences
- Default sort field: dropdown (name, company, spirit type, location, status, rating)
- Default sort direction: ascending/descending
- Default image display: on/off toggle
- Saved to `users.preferences` JSONB

### Section 3 — Storage Locations
- List of all user-defined locations:
  - Name (editable inline)
  - Display order (drag to reorder or up/down arrows)
  - Bottle count (read-only — how many bottles assigned)
  - Delete button (confirmation — warns if bottles are assigned; those bottles get location set to NULL)
- **"Add Location"** button

### Section 4 — Sharing
- List of current shares: recipient email, status (active / pending invite), date shared
- Per share, **visibility toggles**: show/hide prices, locations, ratings, photos, quantities
- **"Share My Bunker"** button → enter email → if they have an account, immediate access + notification; if not, invite email sent. Share activates when they sign up.
- Remove share button per entry

### Section 5 — Account
- Age verification status (verified, read-only)
- Delete account (strong confirmation — "This will permanently delete your account, bunker, and all data")

---

## Screen 10: Shared Bunker View (read-only)

Accessed from "Shared With Me" in the top navigation.

### Shared Bunkers List
- Lists all bunkers shared with the current user
- Shows: owner's display name, total bottle count, date shared

### Shared Bunker Detail
- Clicking a shared bunker opens a **read-only** version of the Bunker List (Screen 2)
- Same layout: sort, filter, image toggle — but only showing fields the owner has made visible per their sharing settings
- No edit/delete/add actions
- Can drill into a read-only Bunker Item Detail (Screen 3)
- Fields hidden by the owner show as "—" or are simply not displayed

---

## Cross-Cutting Concerns

### Barcode Scanning
- Uses device camera via a JavaScript barcode scanning library (e.g., `@nicolo-ribaudo/zxing-browser` or `quagga2`)
- Live viewfinder with real-time detection
- Fallback: manual text entry with Enter-to-search

### Storage Location Combo Dropdown
- Used in: Single Entry, Batch Entry, Bunker Item Detail (edit bottle)
- Autocomplete against existing `user_storage_locations`
- If typed value doesn't match, prompt: "Add '[name]' as a new location?"
- On confirmation, creates the location record and selects it

### Image Priority
- Inventory displays: show user's bottle photos if they exist for the specific bottle; otherwise fall back to the master product image from `product_images`
- Menu and exports: always use master product image (consistent, higher quality)

### Responsive Design
- Desktop-first (primary use case for managing a collection)
- Mobile should work for batch scanning (phone camera) and quick lookups
- Menu preview should render well on all screen sizes (it's meant to be printed)
