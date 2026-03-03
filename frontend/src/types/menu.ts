export interface MenuTemplate {
  id: number;
  user_id: number;
  name: string;
  title: string | null;
  subtitle: string | null;
  settings: MenuSettings;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MenuSettings {
  columns?: 1 | 2 | 3;
  show_abv?: boolean;
  show_age?: boolean;
  show_rating?: boolean;
  show_company?: boolean;
  show_description?: boolean;
  show_tasting_notes?: boolean;
  show_mash_bill?: boolean;
  show_notes?: boolean;
  show_price?: boolean;
  show_logo?: boolean;
  sort_by?: string;
}

export interface MenuTemplateItem {
  id: number;
  bunker_item_id: number;
  display_order: number;
  section_override: string | null;
  name: string;
  spirit_type: string;
  spirit_subtype: string | null;
  proof: number | null;
  age_statement: string | null;
  description: string | null;
  abv: number | null;
  company_name: string | null;
  personal_rating: number | null;
  image_url: string | null;
}

export interface MenuTemplateDetail extends MenuTemplate {
  items: MenuTemplateItem[];
}

export interface MenuPreviewTastingNote {
  source_name: string | null;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  rating_value: number | null;
  rating_scale: string | null;
}

export interface MenuPreviewSection {
  name: string;
  spirit_type: string;
  spirit_subtype: string | null;
  proof: number | null;
  abv: number | null;
  age_statement: string | null;
  description: string | null;
  mash_bill: string | null;
  company_name: string | null;
  personal_rating: number | null;
  image_url: string | null;
  notes: string | null;
  purchase_price: number | null;
  msrp_usd: number | null;
  section_override: string | null;
  tasting_notes?: MenuPreviewTastingNote[];
}

export interface MenuPreviewData {
  template: MenuTemplate & { print_logo_url?: string | null };
  sections: Record<string, MenuPreviewSection[]>;
}
