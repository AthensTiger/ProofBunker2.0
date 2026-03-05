# Proof Bunker — Data Accuracy Improvement Plan

## Overview

Our users have raised valid concerns about the accuracy of product data in Proof Bunker. After a thorough analysis of our database, schema, data sources, and input workflows, we've identified clear root causes and a phased plan to fix them. This document explains what's wrong, why it happened, and exactly how we're going to make it right.

**The guiding principle going forward: the bottle label is the source of truth.**

---

## Problems Identified

### 1. Product Names Don't Match the Bottle Label

**What users see:** Product names that are abbreviated, reformatted, or include retailer junk like bottle sizes and pack descriptions.

**Why it happened:** Our initial ~4,900 products were imported from a scraped retailer/barcode database. Retailers format product names for their own purposes — not to match what's printed on the label. For example:

| What's in our database | What's on the label |
|---|---|
| BUFFALO TRACE BOURBON 750ML | Buffalo Trace Kentucky Straight Bourbon Whiskey |
| MAKERS MARK | Maker's Mark Kentucky Straight Bourbon Whisky |
| WT 101 | Wild Turkey 101 Kentucky Straight Bourbon Whiskey |

The barcode (UPC) database is great for *identifying* a product, but the data registered against those barcodes is often generic, abbreviated, or outdated.

### 2. Company vs. Producer vs. Distillery Is Confused

**What users see:** Incorrect or meaningless company names attached to products. Missing or wrong distillery information.

**Why it happened:** Our schema treats "company" and "distillery" as simple, static references on each product. But the spirits industry doesn't work that way:

- **Producer/Brand** is what's on the label — this is what matters most (e.g., Pursuit United, Barrell Craft Spirits, Smoke Wagon)
- **Distillery** is where the liquid was actually made — and for many products (NDPs / non-distiller producers), this is different from the producer, may be undisclosed, or may just be listed as a state ("Distilled in Indiana")
- **Company** is the parent business entity — but brands get bought and sold constantly. A product's parent company in 2015 may be different from 2025. The UPC was often registered by a company that no longer even owns the brand.

Our current data has company names from whoever registered the UPC years ago, which is frequently wrong or irrelevant to today's user.

### 3. User Submissions Have No Quality Controls

**What users see:** Inconsistent data quality between different products in the database.

**Why it happened:** When users submit a new product, the only validation is "did you type a name and pick a spirit type?" There's no guidance to enter the exact label name, no duplicate detection, no structured separation of brand vs. product line, and no requirement to provide a photo for verification.

### 4. No Distinction Between Data Sources and Confidence

**What users see:** Scraped data with errors sitting side-by-side with carefully entered data, with no way to tell which is which.

**Why it happened:** All products — whether bulk-imported from a barcode database or hand-entered by a knowledgeable user — end up in the same table with the same status. There's no visible quality indicator.

---

## Root Causes (Summary)

1. **Barcode data was treated as the product record** instead of as a lookup key. The UPC is an index — not an authority.
2. **The schema doesn't model the spirits industry correctly.** Producer/brand is missing as a concept. Company and distillery relationships are static when they should be temporal and many-to-many.
3. **No input validation or guidance** ensures users enter accurate, label-based data.
4. **No mechanism to verify or improve data** once it's in the system.

---

## The Plan

### Phase 1: Label Recognition (New Feature)

**Goal:** Make the bottle label the primary input method, eliminating most manual data entry and the errors that come with it.

**How it works:**

- User takes a photo of the front label (instead of or in addition to scanning a barcode)
- The image is sent to Claude's vision AI, which extracts structured data: product name, producer, proof/ABV, age statement, volume, batch/barrel info, limited edition status
- The system searches for a match in our database
- **If found:** Add to the user's bunker — pre-populated, accurate
- **If not found:** Pre-fill the submission form with the extracted label data, so the user barely has to type anything

**Why this matters:**
- The label IS the source of truth, and we're reading it directly
- Eliminates typos and guesswork
- Every submission comes with a photo (built-in verification)
- Data is parsed into structured fields from the start

**Also works for store research:** Same flow, but instead of adding to a bunker, the user gets product details, tasting notes, and community data. If we don't have it yet, AI queries the producer's website for authoritative information.

### Phase 2: Tighter Input Controls

**Goal:** For any remaining manual entry, ensure data quality through smart form design.

**Changes:**

- **Producer autocomplete from a curated list** — fuzzy matching against known producers; don't allow free-text if a match exists
- **Duplicate detection before submission** — "We found similar products, is yours one of these?" before allowing a new entry
- **Structured name guidance** — help text and formatting hints: "Enter the exact name as printed on the bottle label"
- **Required photo** — a label photo is required for all new submissions, giving admins something to verify against
- **Proof/ABV validation** — auto-calculate one from the other, flag impossible values
- **Smart defaults** — selecting a producer auto-suggests spirit type, common proof values, etc.

### Phase 3: AI-Powered Data Cleanup (Existing Records)

**Goal:** Fix the ~4,900 existing products without losing any data.

**How it works:**

- **Step 1 — Staging:** All corrections go into a staging/review table. No live data is overwritten until reviewed.
- **Step 2 — UPC cross-reference:** For products with a UPC, use the barcode to confirm product identity, then query the producer's official website for the correct label name, proof, distillery info, etc.
- **Step 3 — AI enrichment:** For products where UPC data is thin, use the product name + brand to search authoritative sources (producer websites, TTB records).
- **Step 4 — Conflict flagging:** Where existing data disagrees with producer data, flag for manual admin review rather than auto-overwriting.
- **Step 5 — Admin review dashboard:** Admins review suggested corrections with side-by-side comparison (current vs. proposed) and approve/reject each.

**What happens to existing data:** Nothing is deleted. Original scraped data is preserved in an audit trail. Corrections are applied as updates with a clear record of what changed and why.

### Phase 4: Schema Restructure

**Goal:** Model the data correctly for the spirits industry.

**Key changes:**

- **Add Producer/Brand as a first-class entity** — the name on the front of the bottle becomes the primary relationship, separate from company and distillery
- **Demote Company to background info** — still tracked, but not the primary way users find or identify products. Ownership history can be recorded but doesn't affect the product record.
- **Make Distillery a many-to-many relationship** — a product can have multiple source distilleries (or "undisclosed"), and this can change across releases/vintages
- **Add "Undisclosed (State)" as a valid distillery value** — because that's the reality for many products
- **Separate label_name from display_name** — the exact name on the bottle vs. a search-friendly display name
- **Add data provenance tracking** — every field can track where its value came from (label scan, producer website, user entry, scraped) and when it was last verified

**Migration approach:** This will be done carefully with a migration script that maps existing data to the new structure. No data is lost — it's reorganized into the correct relationships.

### Phase 5: Community Corrections

**Goal:** Let the community help maintain data accuracy over time.

- Users can flag incorrect data on any product and suggest corrections
- Corrections go through admin approval
- Frequent accurate contributors earn trust/verification status
- Products display a "verified" badge when label-confirmed

---

## What We're NOT Doing

- **Not deleting any existing data.** Every record is preserved; we're improving and reorganizing, not throwing away.
- **Not removing barcode scanning.** UPC scan remains a fast way to find products — it just won't be the source of product details.
- **Not making the app harder to use.** Label scanning is actually *easier* than typing. Tighter controls are implemented through smart UX, not more required fields.

---

## Priority Order

| Phase | What | Why First |
|---|---|---|
| 1 | Label Recognition | Stops bad data at the source immediately |
| 2 | Tighter Input Controls | Catches anything label scan misses |
| 3 | AI Data Cleanup | Fixes the existing ~4,900 records |
| 4 | Schema Restructure | Correct data model for long-term accuracy |
| 5 | Community Corrections | Ongoing maintenance by the community |

Phases 1-2 can run in parallel. Phase 3 can start independently. Phase 4 requires careful planning but can be designed while 1-3 are in progress.

---

## Success Metrics

- Product names match bottle labels exactly
- Every product has a clear, correct producer/brand
- Distillery information is accurate or explicitly marked "undisclosed"
- New submissions come with label photos and pre-validated data
- Users can trust the data they see in Proof Bunker
