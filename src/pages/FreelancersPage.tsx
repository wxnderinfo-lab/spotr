import { useState, useEffect, useCallback } from 'react';
import { useLocation } from '../components/Router';
import { fetchFreelancers } from '../lib/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import { SkeletonCard } from '../components/ui/Shared';
import {
  Search, MapPin, Star, CheckCircle, Clock, Loader
} from 'lucide-react';

const CATEGORIES = ['All', 'Websites & Apps', 'Design & Branding', 'Photography', 'Videography', 'Marketing & SEO', 'Sports & Coaching', 'Tutoring & Education', 'Cleaning & Maintenance', 'Events & Entertainment'];

const availabilityColors: Record<string, string> = {
  available: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  busy: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  unavailable: 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800',
};

function useFreelancers(filters: { query: string; verified: boolean; available: boolean; maxRate: number }) {
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchFreelancers({
      query: filters.query,
      verified: filters.verified,
      available: filters.available,
      maxRate: filters.maxRate,
      limit: 24,
    });
    const results = data || [];
    setFreelancers(results);
    setTotal(results.length);
    setLoading(false);
  }, [filters.query, filters.verified, filters.available, filters.maxRate]);

  useEffect(() => { load(); }, [load]);

  return { freelancers, loading, total };
}

export default function FreelancersPage() {
  const { navigate } = useLocation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxRate, setMaxRate] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest' | 'rate_asc' | 'rate_desc'>('rating');

  useDocumentTitle('Find Talent');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { freelancers: rawFreelancers, loading, total } = useFreelancers({
    query: debouncedQuery,
    verified: verifiedOnly,
    available: availableOnly,
    maxRate: maxRate ? parseInt(maxRate) : 0,
  });

  const freelancers = [...rawFreelancers].sort((a, b) => {
    const afp = a.freelancer_profile;
    const bfp = b.freelancer_profile;
    if (sort === 'rating') return (bfp?.avg_rating || 0) - (afp?.avg_rating || 0);
    if (sort === 'rate_asc') return (afp?.hourly_rate || 0) - (bfp?.hourly_rate || 0);
    if (sort === 'rate_desc') return (bfp?.hourly_rate || 0) - (afp?.hourly_rate || 0);
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      <div className="pt-16 border-b border-neutral-100 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-5">Find Talent</h1>

          <div className="flex gap-3 flex-wrap mb-5">
            <div className="w-full sm:flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, skills, or specialty..."
                className="input-base pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${verifiedOnly ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'}`}
              >
                <CheckCircle size={12} /> Verified only
              </button>
              <button
                onClick={() => setAvailableOnly(!availableOnly)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${availableOnly ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'}`}
              >
                <Clock size={12} /> Available now
              </button>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">€</span>
                <input
                  type="number"
                  value={maxRate}
                  onChange={e => setMaxRate(e.target.value)}
                  placeholder="Max /hr"
                  className="input-base pl-7 w-28 py-2 text-xs"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-full flex-shrink-0 transition-all ${activeCategory === cat ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {loading ? (
              <span className="flex items-center gap-2"><Loader size={14} className="animate-spin" /> Loading…</span>
            ) : (
              <><span className="font-semibold text-neutral-900 dark:text-white">{total}</span> professionals found</>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Sort:</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="rate_asc">Rate: Low to High</option>
              <option value="rate_desc">Rate: High to Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : freelancers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">No professionals found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => { setQuery(''); setVerifiedOnly(false); setAvailableOnly(false); setMaxRate(''); }}
              className="btn-secondary text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {freelancers.map((freelancer, i) => {
              const fp = freelancer.freelancer_profile;
              const availability = fp?.availability || 'unavailable';
              const hourlyRate = fp?.hourly_rate;
              const skills: string[] = fp?.skills || [];
              const tagline = fp?.tagline || freelancer.bio?.slice(0, 60) || '';

              return (
                <button
                  key={freelancer.id}
                  onClick={() => navigate(`/profile/${freelancer.username || freelancer.id}`)}
                  className="card-hover p-6 text-left animate-fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <Avatar name={freelancer.full_name} src={freelancer.avatar_url} size="lg" />
                      {freelancer.subscription_tier === 'premium' && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                          <Star size={10} className="text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{freelancer.full_name}</p>
                        {freelancer.is_verified && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                      </div>
                      {tagline && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{tagline}</p>}
                      {freelancer.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={11} className="text-neutral-400" />
                          <span className="text-xs text-neutral-400">{freelancer.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {freelancer.bio && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 leading-relaxed">{freelancer.bio}</p>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {skills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">{skill}</span>
                      ))}
                      {skills.length > 3 && <span className="px-2 py-1 text-xs text-neutral-400">+{skills.length - 3}</span>}
                    </div>
                  )}

                  {/* Footer stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      {fp?.avg_rating > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{fp.avg_rating.toFixed(1)}</span>
                          <span className="text-xs text-neutral-400">({fp.review_count || 0})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400">New</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${availabilityColors[availability] || availabilityColors.unavailable}`}>
                        {availability === 'available' ? 'Available' : availability === 'busy' ? 'Busy' : 'Unavailable'}
                      </span>
                      {hourlyRate && (
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">€{hourlyRate}/hr</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
