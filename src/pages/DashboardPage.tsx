import { useEffect, useState } from 'react';
import { Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../components/Router';
import { fetchDashboardStats, fetchMyJobs, fetchMyApplications } from '../lib/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import {
  Briefcase, MessageSquare, Star, Eye, ArrowRight, CheckCircle,
  Plus, ChevronRight, Shield, Zap, Clock, Loader, TrendingUp, Users
} from 'lucide-react';
import { Link as RouterLink } from '../components/Router';

function StatCard({ label, value, sub, icon: Icon, loading }: {
  label: string; value: string | number; sub: string; icon: React.ComponentType<any>; loading: boolean;
}) {
  return (
    <div className="card p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Icon size={16} className="text-neutral-600 dark:text-neutral-400" />
        </div>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-7 w-16 shimmer-bg rounded-lg" />
          <div className="h-3 w-24 shimmer-bg rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">{value}</p>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">{sub}</p>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const { navigate } = useLocation();
  const isFreelancer = profile?.user_type === 'freelancer';
  useDocumentTitle('Dashboard');
  const [stats, setStats] = useState({ jobCount: 0, applicationCount: 0, reviewCount: 0, avgRating: 0, conversationCount: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user || !profile) return;
    fetchDashboardStats(user.id, profile.user_type).then(s => {
      setStats(s);
      setLoadingStats(false);
    });
    if (profile.user_type === 'client') {
      fetchMyJobs(user.id).then(({ data }) => {
        setRecentJobs((data || []).slice(0, 5));
        setLoadingItems(false);
      });
    } else {
      fetchMyApplications(user.id).then(({ data }) => {
        setRecentApps((data || []).slice(0, 5));
        setLoadingItems(false);
      });
    }
  }, [user, profile]);

  const statCards = isFreelancer ? [
    { label: 'Applications Sent', value: stats.applicationCount, sub: 'Total submitted', icon: Briefcase },
    { label: 'Messages', value: stats.conversationCount, sub: 'Active conversations', icon: MessageSquare },
    { label: 'Reviews', value: stats.reviewCount, sub: 'From clients', icon: Star },
    { label: 'Avg Rating', value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', sub: 'Out of 5.0', icon: TrendingUp },
  ] : [
    { label: 'Jobs Posted', value: stats.jobCount, sub: 'All time', icon: Briefcase },
    { label: 'Messages', value: stats.conversationCount, sub: 'Active conversations', icon: MessageSquare },
    { label: 'Applications', value: stats.applicationCount, sub: 'Received', icon: Users },
    { label: 'Avg Rating', value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', sub: 'From professionals', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Welcome header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-4">
              <Avatar name={profile?.full_name || 'U'} src={profile?.avatar_url} size="lg" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{greeting}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                    isFreelancer
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  }`}>
                    {profile?.user_type === 'business' ? 'Business' : isFreelancer ? 'Freelancer' : 'Client'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {profile?.full_name?.split(' ')[0] || 'Welcome back'} 👋
                </h1>
                {profile?.subscription_tier !== 'free' && (
                  <span className={`badge mt-1 text-xs ${profile?.subscription_tier === 'premium' ? 'badge-premium' : 'badge-pro'}`}>
                    {profile?.subscription_tier === 'premium' ? '★ Premium' : '⚡ Pro'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              {isFreelancer ? (
                <Link to="/jobs" className="btn-primary flex items-center gap-2">
                  Find Jobs <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="/jobs/post" className="btn-primary flex items-center gap-2">
                  <Plus size={15} /> Post Job
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(c => (
              <StatCard key={c.label} {...c} loading={loadingStats} />
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Profile completeness */}
              {!profile?.onboarding_completed && (
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Complete your profile</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">A complete profile gets 3× more responses</p>
                    </div>
                    <span className="text-lg font-bold text-amber-500">60%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-4">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700" style={{ width: '60%' }} />
                  </div>
                  <Link to="/onboarding" className="btn-secondary text-sm inline-flex items-center gap-2">
                    Complete Setup <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {/* Recent activity */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {isFreelancer ? 'My Applications' : 'My Job Posts'}
                  </h3>
                  <Link to={isFreelancer ? '/jobs' : '/jobs'} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors flex items-center gap-1">
                    View all <ChevronRight size={13} />
                  </Link>
                </div>

                {loadingItems ? (
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-xl shimmer-bg flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 shimmer-bg rounded" />
                          <div className="h-3 w-1/3 shimmer-bg rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (isFreelancer ? recentApps : recentJobs).length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Briefcase size={24} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                      {isFreelancer ? 'No applications yet' : 'No jobs posted yet'}
                    </p>
                    <Link to={isFreelancer ? '/jobs' : '/jobs/post'} className="btn-secondary text-xs">
                      {isFreelancer ? 'Browse Jobs' : 'Post Your First Job'}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                    {(isFreelancer ? recentApps : recentJobs).map((item: any) => {
                      const title = isFreelancer ? item.job?.title : item.title;
                      const status = isFreelancer ? item.status : item.status;
                      const time = item.created_at;

                      const statusColors: Record<string, string> = {
                        open: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                        pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
                        shortlisted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                        accepted: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
                        rejected: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
                        draft: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
                        in_progress: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                      };

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer"
                          onClick={() => navigate(isFreelancer ? `/jobs/${item.job_id}` : `/jobs/${item.id}`)}
                        >
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                            <Briefcase size={15} className="text-neutral-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{title}</p>
                            <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(time).toLocaleDateString('en-NL', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <span className={`badge text-xs capitalize flex-shrink-0 ${statusColors[status] || statusColors.draft}`}>
                            {status?.replace('_', ' ')}
                          </span>
                          <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-700 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* Upgrade card */}
              {profile?.subscription_tier === 'free' && (
                <div className="rounded-2xl bg-neutral-900 dark:bg-white p-6 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 dark:bg-neutral-900/5 morph-blob" />
                  <div className="relative z-10">
                    <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-neutral-900/10 flex items-center justify-center mb-4">
                      <Zap size={16} className="text-white dark:text-neutral-900" />
                    </div>
                    <h3 className="text-sm font-bold text-white dark:text-neutral-900 mb-1">Upgrade to Pro</h3>
                    <p className="text-xs text-white/60 dark:text-neutral-500 leading-relaxed mb-4">
                      Unlimited applications, featured placement, and verified badge.
                    </p>
                    <Link to="/pricing" className="block w-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-semibold py-2.5 rounded-xl text-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      See Plans
                    </Link>
                  </div>
                </div>
              )}

              {/* Verification card */}
              {!profile?.is_verified && (
                <div className="card p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                      <Shield size={16} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Get Verified</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Boost trust and visibility</p>
                    </div>
                  </div>
                  <Link to="/settings/verify" className="btn-secondary w-full text-center text-xs py-2.5">
                    Start Verification
                  </Link>
                </div>
              )}

              {/* Quick actions — hidden on mobile since BottomNav covers these */}
              <div className="hidden md:block card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600 mb-3">Quick Actions</h3>
                <div className="space-y-0.5">
                  {[
                    { label: isFreelancer ? 'Browse Jobs' : 'Post a Job', href: isFreelancer ? '/jobs' : '/jobs/post', icon: Briefcase },
                    { label: 'Messages', href: '/messages', icon: MessageSquare },
                    { label: 'My Profile', href: `/profile/${profile?.username || profile?.id}`, icon: Eye },
                    { label: 'Pricing', href: '/pricing', icon: Zap },
                  ].map(link => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors group"
                    >
                      <link.icon size={14} className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{link.label}</span>
                      <ChevronRight size={12} className="ml-auto text-neutral-300 dark:text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
