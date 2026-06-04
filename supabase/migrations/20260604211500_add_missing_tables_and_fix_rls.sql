/*
  # Spotr - Extended Schema v2

  ## Changes
  1. New Tables: saved_jobs, payments, reports, admin_logs, portfolio_projects
  2. Added full-text search index on jobs
*/

-- ============================================================
-- SAVED JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved jobs"
  ON saved_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save jobs"
  ON saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave jobs"
  ON saved_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_type text NOT NULL CHECK (payment_type IN ('job_payment', 'subscription', 'featured_listing')),
  stripe_payment_intent_id text,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (payer_id = auth.uid());

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reported_job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- ============================================================
-- ADMIN LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs"
  ON admin_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'));

CREATE POLICY "Only admins can create logs"
  ON admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'));

-- ============================================================
-- PORTFOLIO PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text,
  project_url text,
  tags text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio projects are public"
  ON portfolio_projects FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own portfolio"
  ON portfolio_projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own portfolio"
  ON portfolio_projects FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own portfolio"
  ON portfolio_projects FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_projects(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_fulltext ON jobs USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
