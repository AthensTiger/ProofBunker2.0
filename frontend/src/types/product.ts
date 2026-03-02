export interface ProductSearchResult {
  id: number;
  name: string;
  slug: string;
  spirit_type: string;
  spirit_subtype: string | null;
  abv: number | null;
  proof: number | null;
  age_statement: string | null;
  volume_ml: number | null;
  msrp_usd: number | null;
  is_limited_edition: boolean;
  is_discontinued: boolean;
  company_name: string | null;
  distiller_name: string | null;
  image_url: string | null;
}

export interface AutocompleteResult {
  id: number;
  name: string;
  spirit_type: string;
  company_name: string | null;
  image_url: string | null;
}

export interface ProductDetail extends ProductSearchResult {
  description: string | null;
  mash_bill: string | null;
  barrel_type: string | null;
  barrel_char_level: string | null;
  finish_type: string | null;
  approval_status: 'approved' | 'pending' | 'rejected';
  company_country: string | null;
  distiller_region: string | null;
  distiller_country: string | null;
  images: ProductImage[];
  upcs: ProductUpc[];
  tasting_notes: TastingNote[];
}

export interface ProductImage {
  id: number;
  cdn_url: string | null;
  is_primary: boolean;
  image_type: string;
}

export interface ProductUpc {
  id: number;
  upc: string;
  size_ml: number | null;
  container_type: string | null;
  is_canonical: boolean;
}

export interface TastingNote {
  id: number;
  source_name: string | null;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  rating_value: number | null;
  rating_scale: string | null;
}

export interface UpcLookupResult extends ProductSearchResult {
  upc: string;
  upc_size_ml: number | null;
}

export interface SpiritTypeCount {
  spirit_type: string;
  count: string;
}

export interface CompanyAutocompleteResult {
  id: number;
  name: string;
  country: string | null;
}

export interface DistillerAutocompleteResult {
  id: number;
  name: string;
  country: string | null;
  region: string | null;
}

export interface AdminProductFilters {
  q?: string;
  spirit_type?: string;
  approval_status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CompanyDetail {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  parent_company_id: number | null;
  parent_company_name: string | null;
  country: string | null;
  description: string | null;
  is_verified: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResearchResult {
  name?: string;
  spirit_type?: string;
  spirit_subtype?: string;
  company_name?: string;
  distiller_name?: string;
  proof?: number;
  abv?: number;
  age_statement?: string;
  description?: string;
  mash_bill?: string;
  barrel_type?: string;
  finish_type?: string;
  msrp_usd?: number;
  volume_ml?: number;
  upc?: string;
  country_of_origin?: string;
  region?: string;
  image_urls?: string[];
  confidence: number;
  sources: string[];
}

export interface DistillerDetail {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  founded_year: number | null;
  status: string;
  description: string | null;
  is_verified: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}
