import { useState, useEffect } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { fetchProfileByUsername, fetchProfileById, fetchReviews } from '../lib/queries';
import { useStartConversation } from '../hooks/useMessages';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import { SkeletonCard } from '../components/ui/Shared';
import {
  MapPin, Globe, Star, CheckCircle, Briefcase, MessageSquare,
  ArrowLeft, ChevronRight, Loader, Shield, Clock, TrendingUp,
  Award, Edit, Flag, ExternalLink
} from 'lucide-react';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', color: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' },
  busy: { label: 'Busy', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
  unavailable: { label: 'Unavailable', color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800' },
};

const RATING_CATS = ['Communication', 'Quality', 'Expertise', 'Punctuality'];

export default function ProfilePage({ username }: { username?: string }) {
  const { navigate } = useLocation();
  const { user, profile: myProfile } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  useDocumentTitle(profileData?.full_name);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews'>('overview');
  const { start, loading: startingConv } = useStartConversation();

  const isOwnProfile = myProfile?.username === username || myProfile?.id === username;

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    const load = username.length === 36
      ? fetchProfileById(username)
      : fetchProfileByUsername(username);

    load.then(({ data }) => {
      if (data) {
        setProfileData(data);
        fetchReviews(data.id).then(({ data: rv }) => setReviews(rv || []));
      }
      setLoading(false);
    });
  }, [username]);

  const handleMessage = async () => {
    if (!user || !profileData) { navigate('/auth/login'); return; }
    const convId = await start(user.id, profileData.id);
    if (convId) navigate('/messages');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950">
        <Header />
        <div className="pt-16 max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
            <div className="lg:col-span-2 space-y-4"><SkeletonCard /><SkeletonCard /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <Header />
        <div className="text-center pt-16">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Profile not found</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">This user doesn't exist or their profile is private.</p>
          <button onClick={() => navigate('/freelancers')} className="btn-primary">Browse Professionals</button>
        </div>
      </div>
    );
  }

  const fp = profileData.freelancer_profile;
  const portfolio = profileData.portfolio || [];
  const avgRating = reviews.length > 0 ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length : 0;
  const availability = fp?.availability as keyof typeof AVAILABILITY_CONFIG || 'available';

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button onClick={() => navigate('/freelancers')} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-8 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar */}
            <div className="space-y-5">
              {/* Main profile card */}
              <div className="card p-6">
                <div className="text-center mb-5">
                  <div className="relative inline-block mb-3">
                    <Avatar name={profileData.full_name} src={profileData.avatar_url} size="xl" />
                    {fp?.subscription_tier === 'premium' && (
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-400 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center">
                        <Award size={13} className="text-white" />
                      </div>
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-0.5">{profileData.full_name}</h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{fp?.tagline || profileData.bio?.substring(0, 60)}</p>

                  {/* Verified badge */}
                  {profileData.is_verified && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full w-fit mx-auto">
                      <CheckCircle size={12} />
                      <span className="font-medium">Verified</span>
                    </div>
                  )}
                </div>

                {/* Rating + jobs */}
                {reviews.length > 0 && (
                  <div className="flex items-center justify-center gap-4 py-4 border-y border-neutral-100 dark:border-neutral-800 mb-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-neutral-900 dark:text-white">{avgRating.toFixed(1)}</p>
                      <div className="flex justify-center gap-0.5 my-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={10} className={i <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 dark:text-neutral-700 fill-neutral-200 dark:fill-neutral-700'} />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-400">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                    {fp?.completed_jobs > 0 && (
                      <>
                        <div className="w-px h-10 bg-neutral-100 dark:bg-neutral-800" />
                        <div className="text-center">
                          <p className="text-xl font-bold text-neutral-900 dark:text-white">{fp.completed_jobs}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">Jobs done</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="space-y-2.5 text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                  {profileData.location && (
                    <div className="flex items-center gap-2.5"><MapPin size={14} className="flex-shrink-0" />{profileData.location}</div>
                  )}
                  {profileData.website && (
                    <div className="flex items-center gap-2.5">
                      <Globe size={14} className="flex-shrink-0" />
                      <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1">
                        {profileData.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  {fp?.response_rate > 0 && (
                    <div className="flex items-center gap-2.5"><TrendingUp size={14} className="flex-shrink-0" />{fp.response_rate}% response rate</div>
                  )}
                  {fp?.response_time_hours > 0 && (
                    <div className="flex items-center gap-2.5"><Clock size={14} className="flex-shrink-0" />Responds in ~{fp.response_time_hours}h</div>
                  )}
                </div>

                {/* Availability + rate */}
                {fp && (
                  <>
                    <div className={`text-xs font-medium px-3 py-2 rounded-xl text-center mb-2 ${AVAILABILITY_CONFIG[availability].color}`}>
                      {AVAILABILITY_CONFIG[availability].label}
                    </div>
                    {fp.hourly_rate && (
                      <p className="text-center text-base font-bold text-neutral-900 dark:text-white mb-4">
                        €{fp.hourly_rate}<span className="text-sm font-normal text-neutral-400">/hr</span>
                      </p>
                    )}
                  </>
                )}

                {/* CTA buttons */}
                {isOwnProfile ? (
                  <Link to="/settings" className="btn-secondary w-full flex items-center justify-center gap-2">
                    <Edit size={15} /> Edit Profile
                  </Link>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      onClick={handleMessage}
                      disabled={startingConv}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                      {startingConv ? <Loader size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                      Send Message
                    </button>
                    {!user ? (
                      <button
                        onClick={() => navigate('/auth/register')}
                        className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
                      >
                        <Briefcase size={15} /> Hire Now
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!user || !profileData) return;
                          const convId = await start(user.id, profileData.id);
                          if (convId) navigate('/messages');
                        }}
                        disabled={startingConv}
                        className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
                      >
                        <Briefcase size={15} /> Hire Now
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Skills */}
              {fp?.skills?.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {fp.skills.map((s: string) => (
                      <span key={s} className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {fp?.languages?.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-3">Languages</h3>
                  <div className="space-y-1">
                    {fp.languages.map((l: string) => <p key={l} className="text-sm text-neutral-600 dark:text-neutral-400">{l}</p>)}
                  </div>
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Tabs */}
              <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1">
                {(['overview', 'portfolio', 'reviews'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all ${
                      activeTab === tab
                        ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                        : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    {tab}{tab === 'reviews' && ` (${reviews.length})`}{tab === 'portfolio' && ` (${portfolio.length})`}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-fade-in">
                  {profileData.bio && (
                    <div className="card p-6">
                      <h2 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">About</h2>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                        {profileData.bio}
                      </div>
                    </div>
                  )}

                  {reviews.length > 0 && (
                    <div className="card p-6">
                      <div className="flex items-center gap-5 mb-4">
                        <div className="text-center flex-shrink-0">
                          <p className="text-4xl font-bold text-neutral-900 dark:text-white">{avgRating.toFixed(1)}</p>
                          <div className="flex justify-center gap-0.5 my-1">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={12} className={i <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 dark:text-neutral-700'} />
                            ))}
                          </div>
                          <p className="text-xs text-neutral-400">{reviews.length} reviews</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5,4,3,2,1].map(r => {
                            const count = reviews.filter((rv: any) => rv.rating === r).length;
                            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                            return (
                              <div key={r} className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400 w-3">{r}</span>
                                <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-neutral-400 w-5 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview reviews */}
                  {reviews.slice(0, 2).map((r: any) => (
                    <div key={r.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.reviewer?.full_name || '?'} src={r.reviewer?.avatar_url} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{r.reviewer?.full_name}</p>
                            <p className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('en-NL', { month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={12} className={i <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 dark:text-neutral-700'} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                  {reviews.length > 2 && (
                    <button onClick={() => setActiveTab('reviews')} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium flex items-center gap-1 transition-colors">
                      See all {reviews.length} reviews <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Portfolio */}
              {activeTab === 'portfolio' && (
                <div className="animate-fade-in">
                  {portfolio.length === 0 ? (
                    <div className="card p-12 text-center">
                      <Briefcase size={28} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No portfolio items yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {portfolio.map((item: any) => (
                        <div key={item.id} className="group card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                          {item.image_url ? (
                            <div className="aspect-video overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
                              <Briefcase size={24} className="text-neutral-400" />
                            </div>
                          )}
                          <div className="p-4">
                            <h4 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">{item.title}</h4>
                            {item.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{item.description}</p>}
                            {item.project_url && (
                              <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mt-2 transition-colors">
                                <ExternalLink size={11} /> View project
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              {activeTab === 'reviews' && (
                <div className="space-y-4 animate-fade-in">
                  {reviews.length === 0 ? (
                    <div className="card p-12 text-center">
                      <Star size={28} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No reviews yet</p>
                    </div>
                  ) : (
                    reviews.map((r: any) => (
                      <div key={r.id} className="card p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.reviewer?.full_name || '?'} src={r.reviewer?.avatar_url} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{r.reviewer?.full_name}</p>
                              <p className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString('en-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={13} className={i <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 dark:text-neutral-700'} />
                            ))}
                          </div>
                        </div>
                        {r.title && <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">{r.title}</p>}
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
