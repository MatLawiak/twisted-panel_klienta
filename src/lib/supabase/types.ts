export type Role = 'client' | 'admin'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
}

export type Client = {
  id: string
  name: string
  slug: string
  business_profile: string | null
  logo_url: string | null
  google_ads_customer_id: string | null
  meta_ad_account_id: string | null
  ga4_property_id: string | null
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  client_id: string
  source: 'google_ads' | 'meta' | 'manual'
  external_id: string | null
  name: string
  objective: string | null
  status: string | null
  is_lead_gen: boolean
  visible: boolean
  created_at: string
}

export type MetricDaily = {
  campaign_id: string
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  leads: number
  ctr_pct: number | null
  avg_cpc: number | null
  cpl: number | null
}
