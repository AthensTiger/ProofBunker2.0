import type { TastingNote } from './product';

export interface BunkerListItem {
  id: number;
  product_id: number;
  personal_rating: number | null;
  notes: string | null;
  created_at: string;
  name: string;
  slug: string;
  spirit_type: string;
  spirit_subtype: string | null;
  abv: number | null;
  proof: number | null;
  age_statement: string | null;
  approval_status: 'approved' | 'pending' | 'rejected';
  company_name: string | null;
  image_url: string | null;
  bottle_count: number;
  location_names: string[];
  statuses: string[];
  primary_bottle_id: number | null;
  primary_status: 'sealed' | 'opened' | 'empty' | null;
}

export interface BunkerItemDetail extends BunkerListItem {
  description: string | null;
  volume_ml: number | null;
  msrp_usd: number | null;
  mash_bill: string | null;       // effective (COALESCE override ?? product)
  release_year: number | null;    // effective
  barrel_type: string | null;
  barrel_char_level: string | null;
  finish_type: string | null;
  is_limited_edition: boolean;
  is_discontinued: boolean;
  distiller_name: string | null;
  bottles: BunkerBottle[];
  tasting_notes: TastingNote[];
  // Raw product values
  product_proof: number | null;
  product_abv: number | null;
  product_age_statement: string | null;
  product_mash_bill: string | null;
  product_release_year: number | null;
  product_batch_number: string | null;
  product_barrel_number: string | null;
  // Per-user overrides (null = not set, defers to product value)
  override_proof: number | null;
  override_abv: number | null;
  override_age_statement: string | null;
  override_mash_bill: string | null;
  override_release_year: number | null;
  // Override-only fields (no product counterpart)
  batch_number: string | null;
  barrel_number: string | null;
  year_distilled: number | null;
}

export interface BunkerBottle {
  id: number;
  bunker_item_id: number;
  storage_location_id: number | null;
  status: 'sealed' | 'opened' | 'empty';
  purchase_price: number | null;
  created_at: string;
  updated_at: string;
  location_name: string | null;
  photos: BottlePhoto[];
}

export interface BottlePhoto {
  id: number;
  cdn_url: string;
  display_order: number;
}

export interface BunkerFilters {
  spirit_type?: string;
  location_id?: number;
  statuses?: ('sealed' | 'opened' | 'empty')[];
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export interface AddToBunkerRequest {
  product_id: number;
  storage_location_id?: number | null;
  status?: string;
  purchase_price?: number | null;
}

export interface AddToBunkerResponse {
  bunker_item_id: number;
  bottle: BunkerBottle;
}
