export interface Trademark {
  id: string;
  name: string;
  category: number;
  price: number;
  products_services: string;
  groups: string;
  registration_date: string;
  valid_from: string;
  valid_to: string;
  application_count: number;
  trademark_no: string;
  ai_description: string;
  remark: string;
  image_url: string | null;
  created_at: string;
}

export interface InternationalTrademark {
  id: string;
  country: string;
  name: string;
  description: string;
  trademark_no: string;
  category: number;
  price: number;
  registration_date: string;
  valid_from: string;
  valid_to: string;
  cn_items: string;
  local_items: string | null;
  en_items: string | null;
  image_url: string | null;
  created_at: string;
}

export interface CategoryCount {
  category: number;
  count: number;
}

export interface CountryCount {
  country: string;
  count: number;
}

export type TrademarkType = 'premium' | 'discount' | 'international';
