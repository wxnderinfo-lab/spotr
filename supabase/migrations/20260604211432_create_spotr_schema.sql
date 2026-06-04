/*
  # Spotr Marketplace - Initial Schema

  ## Overview
  Full marketplace schema for Spotr, connecting clients with verified freelancers and businesses.

  ## Tables

  ### profiles
  Extended user profile data beyond auth.users. Stores user type, bio, location, verification status, and subscription tier.

  ### categories
  Service categories (Websites, Design, Photography, etc.). Seeded with predefined categories.

  ### jobs
  Posted jobs/projects from clients. Includes title, description, budget, category, location, status.

  ### job_applications
  Freelancer applications to jobs. Includes proposal, bid amount, status.

  ### freelancer_profiles
  Detailed freelancer data: portfolio, skills, hourly rate, response rate, verification.

  ### reviews
  Reviews left by clients for freelancers (and vice versa). Rating 1-5 with comment.

  ### conversations
  Chat conversations between two users.

  ### messages
  Individual chat messages within a conversation. Supports text and file attachments.

  ### subscriptions
  User subscription records tracking plan, billing period, status.

  ### verifications
  Verification requests for KVK (businesses) and identity (freelancers). Tracks status and documents.

  ### notifications
  In-app notifications for users.

  ## Security
  RLS enabled on all tables. Users can only access their own data or publicly visible data.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  username text UNIQUE,
  avatar_url text,
  user_type text NOT NULL DEFAULT 'client' CHECK (user_type IN ('client', 'freelancer', 'business', 'admin')),
  bio text DEFAULT '',
  location text DEFAULT '',
  website text DEFAULT '',
  phone text DEFAULT '',
  is_verified boolean DEFAULT false,
  verification_badge text,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  dark_mode boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  description text DEFAULT '',
  job_count integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Websites', 'websites', 'Globe', 'Web development and design', 1),
  ('Design', 'design', 'Palette', 'Graphic design and branding', 2),
  ('Photography', 'photography', 'Camera', 'Photography services', 3),
  ('Videography', 'videography', 'Video', 'Video production and editing', 4),
  ('Home Services', 'home-services', 'Home', 'General home services', 5),
  ('Cleaning', 'cleaning', 'Sparkles', 'Home and office cleaning', 6),
  ('Moving', 'moving', 'Truck', 'Moving and relocation services', 7),
  ('Gardening', 'gardening', 'Leaf', 'Garden care and landscaping', 8),
  ('Tutoring', 'tutoring', 'BookOpen', 'Educational tutoring', 9),
  ('Sports Coaching', 'sports-coaching', 'Trophy', 'Personal training and coaching', 10),
  ('Events', 'events', 'Calendar', 'Event planning and coordination', 11),
  ('Repairs', 'repairs', 'Wrench', 'Repairs and maintenance', 12),
  ('Marketing', 'marketing', 'TrendingUp', 'Digital and traditional marketing', 13)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FREELANCER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS freelancer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagline text DEFAULT '',
  hourly_rate numeric(10,2),
  availability text DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
  skills text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  portfolio_urls jsonb DEFAULT '[]',
  response_rate integer DEFAULT 0,
  response_time_hours integer DEFAULT 24,
  total_earnings numeric(12,2) DEFAULT 0,
  completed_jobs integer DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  kvk_number text,
  company_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE freelancer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelancer profiles are viewable by everyone"
  ON freelancer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Freelancers can insert own profile"
  ON freelancer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Freelancers can update own profile"
  ON freelancer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  title text NOT NULL,
  description text NOT NULL,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  budget_type text DEFAULT 'fixed' CHECK (budget_type IN ('fixed', 'hourly')),
  location text DEFAULT '',
  remote_ok boolean DEFAULT true,
  skills_required text[] DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'draft')),
  application_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  deadline date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open jobs are viewable by everyone"
  ON jobs FOR SELECT
  USING (status != 'draft' OR client_id = auth.uid());

CREATE POLICY "Authenticated users can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can delete own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = client_id);

-- ============================================================
-- JOB APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposal text NOT NULL,
  bid_amount numeric(10,2),
  delivery_days integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, freelancer_id)
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job owners and applicants can view applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid())
  );

CREATE POLICY "Freelancers can apply to jobs"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = freelancer_id);

CREATE POLICY "Applicants can update own applications"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (freelancer_id = auth.uid() OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid()))
  WITH CHECK (freelancer_id = auth.uid() OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid()));

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text DEFAULT '',
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count_1 integer DEFAULT 0,
  unread_count_2 integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Participants can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  file_url text,
  file_name text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('identity', 'kvk', 'address')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  document_urls jsonb DEFAULT '[]',
  kvk_number text,
  company_name text,
  rejection_reason text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
  ON verifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Users can submit verifications"
  ON verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verifications"
  ON verifications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin'));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_freelancer ON job_applications(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-z0-9]', '', 'g'
  ));

  IF length(base_username) < 3 THEN
    base_username := split_part(NEW.email, '@', 1);
  END IF;

  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    final_username
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
