import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createMock() {
  const noop = () => ({ data: null, error: null });

  class MockQuery {
    select() { return this; }
    insert() { return this; }
    update() { return this; }
    delete() { return this; }
    eq() { return this; }
    or() { return this; }
    maybeSingle() { return Promise.resolve({ data: null, error: null }); }
    single() { return Promise.resolve({ data: null, error: null }); }
    then(resolve: any) { return Promise.resolve({ data: null, error: null }).then(resolve); }
  }

  const mock = {
    from: (_: string) => new MockQuery(),
    rpc: async () => ({ data: null, error: null }),
    removeChannel: () => {},
    channel: () => ({ on: () => ({}) , subscribe: async () => ({}) }),
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (_: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as any;

  return mock;
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, { realtime: { params: { eventsPerSecond: 10 } } })
  : (() => {
      // Warn in dev and fall back to a mock client so the app can render without a Supabase setup
      // eslint-disable-next-line no-console
      console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set — using mock supabase client for local development.');
      return createMock();
    })();

export type UserType = 'client' | 'freelancer' | 'business' | 'admin';
export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'draft';
export type ApplicationStatus = 'pending' | 'viewed' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type Availability = 'available' | 'busy' | 'unavailable';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  user_type: UserType;
  bio: string;
  location: string;
  website: string;
  phone: string;
  is_verified: boolean;
  verification_badge: string | null;
  subscription_tier: SubscriptionTier;
  dark_mode: boolean;
  onboarding_completed: boolean;
  notification_preferences?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  job_count: number;
  sort_order: number;
  created_at: string;
}

export interface FreelancerProfile {
  id: string;
  user_id: string;
  tagline: string;
  hourly_rate: number | null;
  availability: Availability;
  skills: string[];
  languages: string[];
  portfolio_urls: PortfolioItem[];
  response_rate: number;
  response_time_hours: number;
  total_earnings: number;
  completed_jobs: number;
  avg_rating: number;
  review_count: number;
  kvk_number: string | null;
  company_name: string | null;
  subscription_tier?: SubscriptionTier;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface PortfolioItem {
  url: string;
  title: string;
  image?: string;
  description?: string;
}

export interface Job {
  id: string;
  client_id: string;
  category_id: string | null;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: 'fixed' | 'hourly';
  location: string;
  remote_ok: boolean;
  skills_required: string[];
  status: JobStatus;
  application_count: number;
  view_count: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  client?: Profile;
  category?: Category;
}

export interface JobApplication {
  id: string;
  job_id: string;
  freelancer_id: string;
  proposal: string;
  bid_amount: number | null;
  delivery_days: number | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  freelancer?: Profile;
  job?: Job;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  job_id: string | null;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  reviewer?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string;
  last_message_at: string;
  unread_count_1: number;
  unread_count_2: number;
  created_at: string;
  other_participant?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  verification_type: 'identity' | 'kvk' | 'address';
  status: VerificationStatus;
  document_urls: string[];
  kvk_number: string | null;
  company_name: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
