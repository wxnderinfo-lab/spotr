import { supabase } from './supabase';
import type { Profile, Job, Conversation, Message, Notification, FreelancerProfile } from './supabase';

// ─── Jobs ───────────────────────────────────────────────────────────────────

export async function fetchJobs({
  query = '',
  category = '',
  remoteOnly = false,
  budgetMin = 0,
  budgetMax = 0,
  page = 0,
  limit = 20,
}: {
  query?: string;
  category?: string;
  remoteOnly?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  page?: number;
  limit?: number;
} = {}) {
  let q = supabase
    .from('jobs')
    .select(`
      *,
      client:profiles!jobs_client_id_fkey(id, full_name, avatar_url, is_verified, location),
      category:categories!jobs_category_id_fkey(id, name, slug, icon)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (query) {
    q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (remoteOnly) q = q.eq('remote_ok', true);
  if (budgetMin > 0) q = q.gte('budget_min', budgetMin);
  if (budgetMax > 0) q = q.lte('budget_max', budgetMax);

  return q;
}

export async function fetchJobById(id: string) {
  return supabase
    .from('jobs')
    .select(`
      *,
      client:profiles!jobs_client_id_fkey(id, full_name, avatar_url, is_verified, location, bio),
      category:categories!jobs_category_id_fkey(id, name, slug, icon)
    `)
    .eq('id', id)
    .maybeSingle();
}

export async function createJob(data: {
  client_id: string;
  title: string;
  description: string;
  category_id?: string;
  budget_min?: number;
  budget_max?: number;
  budget_type: 'fixed' | 'hourly';
  location: string;
  remote_ok: boolean;
  skills_required: string[];
  deadline?: string;
  status: 'open' | 'draft';
}) {
  return supabase.from('jobs').insert(data).select().single();
}

export async function fetchMyJobs(userId: string) {
  return supabase
    .from('jobs')
    .select(`*, category:categories!jobs_category_id_fkey(id, name)`)
    .eq('client_id', userId)
    .order('created_at', { ascending: false });
}

export async function saveJob(userId: string, jobId: string) {
  return supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
}

export async function unsaveJob(userId: string, jobId: string) {
  return supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
}

export async function fetchSavedJobs(userId: string) {
  return supabase
    .from('saved_jobs')
    .select(`job:jobs!saved_jobs_job_id_fkey(*, category:categories!jobs_category_id_fkey(id, name, icon))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

// ─── Applications ────────────────────────────────────────────────────────────

export async function applyToJob(data: {
  job_id: string;
  freelancer_id: string;
  proposal: string;
  bid_amount?: number;
  delivery_days?: number;
}) {
  return supabase.from('job_applications').insert(data).select().single();
}

export async function fetchMyApplications(freelancerId: string) {
  return supabase
    .from('job_applications')
    .select(`*, job:jobs!job_applications_job_id_fkey(id, title, budget_min, budget_max, budget_type, status, created_at, client:profiles!jobs_client_id_fkey(full_name, avatar_url))`)
    .eq('freelancer_id', freelancerId)
    .order('created_at', { ascending: false });
}

export async function fetchJobApplications(jobId: string) {
  return supabase
    .from('job_applications')
    .select(`*, freelancer:profiles!job_applications_freelancer_id_fkey(id, full_name, avatar_url, is_verified, bio, location)`)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function fetchProfileByUsername(username: string) {
  return supabase
    .from('profiles')
    .select(`
      *,
      freelancer_profile:freelancer_profiles!freelancer_profiles_user_id_fkey(*),
      portfolio:portfolio_projects(*)
    `)
    .eq('username', username)
    .maybeSingle();
}

export async function fetchProfileById(id: string) {
  return supabase
    .from('profiles')
    .select(`
      *,
      freelancer_profile:freelancer_profiles!freelancer_profiles_user_id_fkey(*),
      portfolio:portfolio_projects(*)
    `)
    .eq('id', id)
    .maybeSingle();
}

export async function fetchFreelancers({
  query = '',
  verified = false,
  available = false,
  maxRate = 0,
  page = 0,
  limit = 18,
}: {
  query?: string;
  verified?: boolean;
  available?: boolean;
  maxRate?: number;
  page?: number;
  limit?: number;
} = {}) {
  let q = supabase
    .from('profiles')
    .select(`
      *,
      freelancer_profile:freelancer_profiles!freelancer_profiles_user_id_fkey(*)
    `)
    .in('user_type', ['freelancer', 'business'])
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (verified) q = q.eq('is_verified', true);
  if (query) {
    q = q.or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`);
  }

  return q;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function fetchReviews(userId: string) {
  return supabase
    .from('reviews')
    .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, avatar_url)`)
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
}

export async function createReview(data: {
  reviewer_id: string;
  reviewee_id: string;
  job_id?: string;
  rating: number;
  title: string;
  comment: string;
}) {
  return supabase.from('reviews').insert(data).select().single();
}

// ─── Conversations & Messages ─────────────────────────────────────────────────

export async function fetchConversations(userId: string) {
  return supabase
    .from('conversations')
    .select(`
      *,
      p1:profiles!conversations_participant_1_fkey(id, full_name, avatar_url),
      p2:profiles!conversations_participant_2_fkey(id, full_name, avatar_url)
    `)
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });
}

export async function getOrCreateConversation(userId: string, otherId: string) {
  // Check if conversation exists (either direction)
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(participant_1.eq.${userId},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${userId})`
    )
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  return supabase
    .from('conversations')
    .insert({ participant_1: userId, participant_2: otherId })
    .select()
    .single();
}

export async function fetchMessages(conversationId: string) {
  return supabase
    .from('messages')
    .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)`)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
}

export async function sendMessage(data: {
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'file' | 'image';
}) {
  const result = await supabase.from('messages').insert(data).select().single();

  if (!result.error) {
    // Update conversation last_message
    await supabase
      .from('conversations')
      .update({ last_message: data.content, last_message_at: new Date().toISOString() })
      .eq('id', data.conversation_id);

    // Get the other participant and notify them
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', data.conversation_id)
      .maybeSingle();

    if (conv) {
      const recipientId = conv.participant_1 === data.sender_id ? conv.participant_2 : conv.participant_1;
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.sender_id)
        .maybeSingle();

      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'message',
        title: sender?.full_name || 'Someone',
        body: data.content.length > 80 ? data.content.slice(0, 80) + '…' : data.content,
        link: '/messages',
      });
    }
  }

  return result;
}

export async function markMessagesRead(conversationId: string, userId: string) {
  return supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function fetchNotifications(userId: string) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string) {
  return supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
}

// ─── Verifications ────────────────────────────────────────────────────────────

export async function submitVerification(data: {
  user_id: string;
  verification_type: 'identity' | 'kvk' | 'address';
  kvk_number?: string;
  company_name?: string;
}) {
  return supabase.from('verifications').insert(data).select().single();
}

export async function fetchMyVerifications(userId: string) {
  return supabase.from('verifications').select('*').eq('user_id', userId);
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function fetchDashboardStats(userId: string, userType: string) {
  const [jobs, applications, reviews, convs] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('client_id', userId),
    supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('freelancer_id', userId),
    supabase.from('reviews').select('rating').eq('reviewee_id', userId),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
  ]);

  const ratings = (reviews.data || []).map((r: { rating: number }) => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;

  return {
    jobCount: jobs.count || 0,
    applicationCount: applications.count || 0,
    reviewCount: ratings.length,
    avgRating: Math.round(avgRating * 10) / 10,
    conversationCount: convs.count || 0,
  };
}
