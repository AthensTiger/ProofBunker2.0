# Bottle Data Reference

Everything the Proof Bunker database can collect on a bottle, organized by table.

---

## Master Product Record (`products`)
*Shared community data — one row per distinct bottling*

### Identity
| Field | Notes |
|---|---|
| `name` | Full product name |
| `slug` | URL-friendly identifier |
| `spirit_type` | `whiskey`, `tequila`, `mezcal`, `rum`, `vodka`, `gin`, `brandy`, `liqueur`, `other` |
| `spirit_subtype` | e.g. bourbon, single malt, blanco, añejo |
| `distiller_id` | Links to the physical distillery record |
| `company_id` | Links to the brand/marketing company record |

### Production Specs
| Field | Notes |
|---|---|
| `abv` | Stored as decimal fraction — 0.45 = 45% |
| `proof` | Typically ABV × 2 (US convention) |
| `age_statement` | Free text: "12 Year", "NAS", etc. |
| `volume_ml` | Bottle size in millilitres |
| `mash_bill` | e.g. "75% corn, 13% rye, 12% malted barley" |
| `barrel_type` | e.g. "new, charred American oak" |
| `barrel_char_level` | e.g. "#4 Char" |
| `finish_type` | e.g. "Port Cask Finish" |
| `distillation_method` | e.g. "Pot Still" |
| `batch_number` | |
| `barrel_number` | |
| `vintage_year` | Year the spirit was distilled |
| `release_year` | Year the bottle was released |

### Classification Flags
| Field | Notes |
|---|---|
| `is_limited_edition` | Boolean |
| `is_discontinued` | Boolean |
| `is_single_cask` | Boolean |
| `cask_strength` | Boolean |

### Pricing & Description
| Field | Notes |
|---|---|
| `msrp_usd` | Manufacturer's suggested retail price |
| `description` | Long-form text description |
| `upc` | Canonical UPC barcode (denormalized) |

---

## Barcodes (`product_upcs`)
*A product can have multiple UPCs for different sizes/containers*

| Field | Notes |
|---|---|
| `upc` | Barcode string |
| `size_ml` | Bottle size this UPC corresponds to |
| `container_type` | Glass Bottle, Plastic Bottle, etc. |
| `is_canonical` | TRUE for the primary 750ml glass entry |
| `source` | Where this UPC data came from |

---

## Bottle Images (`product_images`)

| Field | Notes |
|---|---|
| `cdn_url` | Public URL served to browsers |
| `image_type` | `bottle`, `label`, or `box` |
| `is_primary` | Main display image |
| `extracted_text` | OCR text read from the label |
| `label_confidence` | Confidence score of the OCR/ML extraction |
| `perceptual_hash` | Used for duplicate image detection |

---

## Reference Tasting Notes (`tasting_notes`)
*Scraped from external sources — read-only community reference data*

| Field | Notes |
|---|---|
| `nose` | Aroma notes |
| `palate` | Taste notes |
| `finish` | Finish notes |
| `overall_notes` | General review text |
| `rating_value` | Numeric score |
| `rating_scale` | `"5"` (community) or `"100"` (expert) |
| `reviewer_type` | `community` or `expert` |
| `source_name` | e.g. "distiller_com", "mezcal_reviews" |

---

## Competition Awards (`awards`)

| Field | Notes |
|---|---|
| `competition_name` | e.g. "San Francisco World Spirits Competition" |
| `year` | Year of the award |
| `medal` | gold, silver, bronze, double_gold, etc. |

---

## Distillery Record (`distillers`)
*Linked from the product*

| Field | Notes |
|---|---|
| `name` | Distillery name |
| `country` | |
| `region` | e.g. Kentucky, Speyside, Jalisco |
| `city` | |
| `address` | |
| `latitude` / `longitude` | GPS coordinates |
| `website` | |
| `founded_year` | |
| `status` | active / closed / etc. |
| `description` | |

---

## Brand / Company Record (`companies`)
*Linked from the product*

| Field | Notes |
|---|---|
| `name` | Brand/company name |
| `country` | |
| `website` | |
| `parent_company_id` | Supports ownership hierarchy |
| `description` | |

---

## Your Personal Bottle (`bunker_bottles`)
*One row per physical bottle you own*

| Field | Notes |
|---|---|
| `status` | `sealed`, `opened`, or `empty` |
| `purchase_price` | What you paid |
| `storage_location_id` | Links to your named storage location |
| `created_at` | When you added it to your bunker |

---

## Your Bottle Photos (`bunker_bottle_photos`)
*Up to 5 photos per physical bottle*

| Field | Notes |
|---|---|
| `cdn_url` | Public URL of your uploaded photo |
| `display_order` | Order photos appear in |

---

## Your Personal Product Notes (`bunker_items`)
*One row per product (covers all physical bottles of that product)*

| Field | Notes |
|---|---|
| `personal_rating` | 1–5 stars |
| `notes` | Free-text personal notes |

---

## Storage Locations (`user_storage_locations`)
*Your named locations, assigned to individual bottles*

| Field | Notes |
|---|---|
| `name` | e.g. "Kitchen Bar", "Basement Rack", "Safe" |
| `display_order` | Order they appear in the UI |

---

## Fields in the Schema But Not Yet Exposed in the UI
These are stored in the database and ready to use but have no input fields in the app yet:

- Mash bill
- Barrel type / char level
- Finish type
- Distillation method
- Batch number / barrel number
- Vintage year / release year
- Competition awards
- Distillery GPS coordinates, address, founded year
- Reference tasting notes (nose / palate / finish from scraped sources)
