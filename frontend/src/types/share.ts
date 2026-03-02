export interface BunkerShare {
  id: number;
  owner_user_id: number;
  shared_with_email: string;
  shared_with_user_id: number | null;
  shared_with_name: string | null;
  visibility: ShareVisibility;
  status: 'active' | 'pending';
  created_at: string;
}

export interface ShareVisibility {
  show_prices: boolean;
  show_locations: boolean;
  show_ratings: boolean;
  show_photos: boolean;
  show_quantities: boolean;
}

export interface SharedBunker {
  id: number;
  owner_user_id: number;
  owner_name: string | null;
  owner_avatar: string | null;
  visibility: ShareVisibility;
  created_at: string;
}

export interface SharedBunkerItemsResponse {
  share: {
    id: number;
    visibility: ShareVisibility;
    owner_user_id: number;
  };
  items: SharedBunkerItem[];
}

export interface SharedBunkerItem {
  id: number;
  product_id: number;
  created_at: string;
  name: string;
  slug: string;
  spirit_type: string;
  spirit_subtype: string | null;
  abv: number | null;
  proof: number | null;
  age_statement: string | null;
  company_name: string | null;
  personal_rating?: number | null;
  image_url?: string | null;
  bottle_count?: number;
  location_names?: string[];
}
