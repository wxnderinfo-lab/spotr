import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { useJobs, useSavedJobs } from '../hooks/useJobs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import { SkeletonCard, EmptyState } from '../components/ui/Shared';
import type { Job } from '../lib/supabase';
import {
  Search, MapPin, Clock, DollarSign, Briefcase, SlidersHorizontal,
  ChevronDown, X, Globe, ArrowRight, Bookmark, BookmarkCheck,
  Loader, Wifi, WifiOff
} from 'lucide-react';

const BUDGET_OPTIONS = [
  { label: 'Any budget', value: '' },
  { label: 'Under €100', value: '0-100' },
  { label: '€100 – €500', value: '100-500' },
  { label: '€500 – €2,000', value: '500-2000' },
  { label: '€2,000 – €10,000', value: '2000-10000' },
  { label: 'Over €10,000', value: '10000+' },
];

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Budget: High to Low', value: 'budget_desc' },
  { label: 'Budget: Low to High', value: 'budget_asc' },
];

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function formatBudget(job: Job) {
  if (!job.budget_min && !job.budget_max) return 'Budget open';
  if (job.budget_type === 'hourly') {
    if (job.budget_min && job.budget_max) return `€${job.budget_min}–€${job.budget_max}/hr`;
    return `€${job.budget_min || job.budget_max}/hr`;
  }
  if (job.budget_min && job.budget_max) return `€${job.budget_min.toLocaleString()}–€${job.budget_max.toLocaleString()}`;
  return `€${(job.budget_min || job.budget_max || 0).toLocaleString()}`;
}

export default function JobsPage() {
  const { navigate } = useLocation();
  const { user, profile } = useAuth();
  const isFreelancer = profile?.user_type === 'freelancer';
  const params = new URLSearchParams(window.location.search);

  useDocumentTitle(isFreelancer ? 'Find Work' : 'Browse Jobs');

  const [query, setQuery] = useState(params.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('newest');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { jobs, loading, error, refetch } = useJobs({ query: debouncedQuery, remoteOnly });
  const { savedJobIds, toggle: toggleSave } = useSavedJobs(user?.id);

  // Client-side sort
  const sorted = [...jobs].sort((a, b) => {
    if (sort === 'budget_desc') return (b.budget_max || 0) - (a.budget_max || 0);
    if (sort === 'budget_asc') return (a.budget_min || 0) - (b.budget_min || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasActiveFilters = remoteOnly;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      {/* Top bar */}
      <div className="pt-16 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {isFreelancer ? 'Find Work' : 'Browse Jobs'}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {loading ? 'Loading…' : `${sorted.length} open position${sorted.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {!isFreelancer && (
              <Link to="/jobs/post" className="btn-primary flex items-center gap-2 flex-shrink-0">
                <Briefcase size={15} /> Post a Job
              </Link>
            )}
          </div>

          {/* Search + controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              {loading && debouncedQuery && (
                <Loader size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin" />
              )}
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search jobs, skills, keywords…"
                className="input-base pl-10"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary flex items-center gap-2 flex-shrink-0 ${showFilters ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
              >
                <SlidersHorizontal size={15} />
                Filters
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />}
              </button>

              <div className="relative flex-1 sm:flex-none">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="input-base appearance-none pr-8 text-sm cursor-pointer w-full"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="mt-4 p-5 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl border border-neutral-100 dark:border-neutral-800 animate-fade-in">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRemoteOnly(!remoteOnly)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full border transition-all ${
                      remoteOnly
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
                    }`}
                  >
                    <Globe size={12} /> Remote only
                  </button>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => setRemoteOnly(false)}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  >
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
              <WifiOff size={24} className="text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">Failed to load jobs</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">{error}</p>
            <button onClick={refetch} className="btn-secondary flex items-center gap-2">
              <Loader size={14} /> Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description={debouncedQuery ? `No results for "${debouncedQuery}". Try different keywords.` : 'No open jobs right now. Check back soon.'}
            action={
              <div className="flex gap-3">
                {debouncedQuery && (
                  <button onClick={() => setQuery('')} className="btn-secondary">Clear search</button>
                )}
                {!isFreelancer && (
                  <Link to="/jobs/post" className="btn-primary">Post a Job</Link>
                )}
              </div>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {sorted.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                isSaved={savedJobIds.has(job.id)}
                onSave={user ? () => toggleSave(job.id) : () => navigate('/auth/register')}
                onClick={() => navigate(`/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function JobCard({
  job, index, isSaved, onSave, onClick,
}: {
  job: Job;
  index: number;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
}) {
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
  };

  const client = (job as any).client;
  const category = (job as any).category;

  return (
    <div
      className="card-hover p-6 cursor-pointer animate-fade-up relative group"
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
      onClick={onClick}
    >
      {/* Save button */}
      <button
        onClick={handleSave}
        className={`absolute top-4 right-4 p-2 rounded-xl transition-all duration-200 ${
          isSaved
            ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800'
            : 'text-neutral-300 dark:text-neutral-700 opacity-0 group-hover:opacity-100 hover:text-neutral-600 dark:hover:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
        }`}
        aria-label={isSaved ? 'Unsave job' : 'Save job'}
      >
        {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      </button>

      {/* Client info */}
      {client && (
        <div className="flex items-center gap-2 mb-3">
          <Avatar name={client.full_name} src={client.avatar_url} size="xs" />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">{client.full_name}</span>
          {client.is_verified && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓</span>
          )}
          {category && (
            <>
              <span className="text-neutral-200 dark:text-neutral-700">·</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">{category.name}</span>
            </>
          )}
        </div>
      )}

      <h3 className="font-semibold text-neutral-900 dark:text-white text-base leading-snug mb-2 pr-10 line-clamp-2">
        {job.title}
      </h3>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
        {job.description}
      </p>

      {/* Skills */}
      {job.skills_required.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills_required.slice(0, 4).map(skill => (
            <span key={skill} className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
              {skill}
            </span>
          ))}
          {job.skills_required.length > 4 && (
            <span className="px-2 py-1 text-xs text-neutral-400">+{job.skills_required.length - 4}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 pt-3 border-t border-neutral-50 dark:border-neutral-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300 text-sm">
            <DollarSign size={12} className="text-green-500" />
            {formatBudget(job)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {job.location || 'Remote'}
            {job.remote_ok && job.location && <span className="text-blue-500 ml-0.5">(Remote)</span>}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Briefcase size={11} />
            {job.application_count}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatTimeAgo(job.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
