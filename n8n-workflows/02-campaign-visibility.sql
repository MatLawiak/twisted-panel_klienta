-- ═══════════════════════════════════════════════════════════════
-- Widoczność kampanii — admin wybiera które kampanie widzi klient
-- Uruchom w Supabase → SQL Editor (jednorazowo)
-- ═══════════════════════════════════════════════════════════════

-- Domyślnie kampania jest widoczna. Admin może ją ukryć dla klienta.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;

-- Indeks pomocniczy do filtrowania w dashboardzie
CREATE INDEX IF NOT EXISTS idx_campaigns_visible ON campaigns(client_id, visible);
