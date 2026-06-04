import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from '../components/Router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  Search, ArrowRight, Star, CheckCircle, Globe, Palette, Camera,
  Video, Home, Sparkles, Truck, Leaf, BookOpen, Trophy, Calendar,
  Wrench, TrendingUp, ChevronRight, Users, Briefcase, Shield, Zap
} from 'lucide-react';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';

const CATEGORIES = [
  { name: 'Websites', icon: Globe, count: '2.4k', color: 'from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { name: 'Design', icon: Palette, count: '3.1k', color: 'from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
  { name: 'Photography', icon: Camera, count: '1.8k', color: 'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { name: 'Videography', icon: Video, count: '987', color: 'from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { name: 'Home Services', icon: Home, count: '1.5k', color: 'from-neutral-50 to-neutral-100 dark:from-neutral-900/60 dark:to-neutral-800/40', iconColor: 'text-neutral-600 dark:text-neutral-400' },
  { name: 'Cleaning', icon: Sparkles, count: '743', color: 'from-cyan-50 to-cyan-100 dark:from-cyan-950/40 dark:to-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  { name: 'Moving', icon: Truck, count: '512', color: 'from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { name: 'Gardening', icon: Leaf, count: '634', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Tutoring', icon: BookOpen, count: '1.2k', color: 'from-violet-50 to-violet-100 dark:from-violet-950/40 dark:to-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
  { name: 'Sports Coaching', icon: Trophy, count: '445', color: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/40 dark:to-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  { name: 'Events', icon: Calendar, count: '876', color: 'from-pink-50 to-pink-100 dark:from-pink-950/40 dark:to-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400' },
  { name: 'Marketing', icon: TrendingUp, count: '2.2k', color: 'from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400' },
  { name: 'Repairs', icon: Wrench, count: '932', color: 'from-stone-50 to-stone-100 dark:from-stone-950/40 dark:to-stone-900/30', iconColor: 'text-stone-600 dark:text-stone-400' },
];

const TESTIMONIALS = [
  { name: 'Emma van der Berg', role: 'Startup Founder', avatar: null, rating: 5, text: 'Found an incredible web developer within hours. The verification system gave me total peace of mind. Spotr is the future of hiring.', project: 'E-commerce Platform' },
  { name: 'Marcus Hoffman', role: 'Marketing Director', avatar: null, rating: 5, text: 'Our entire rebrand was handled through Spotr. Every freelancer was professional, verified, and delivered beyond expectations.', project: 'Brand Identity' },
  { name: 'Sophie Laurent', role: 'Freelance Photographer', avatar: null, rating: 5, text: 'As a freelancer, Spotr completely transformed my business. The Pro plan pays for itself with a single client. Highly recommend.', project: 'Joined as Freelancer' },
  { name: 'Jan de Vries', role: 'Property Manager', avatar: null, rating: 5, text: 'I use Spotr every week for cleaning and maintenance services. The quality of providers is consistently excellent.', project: 'Regular Client' },
];

const STATS = [
  { label: 'Verified Professionals', value: '42,000+', icon: Shield },
  { label: 'Jobs Completed', value: '180,000+', icon: Briefcase },
  { label: 'Happy Clients', value: '28,000+', icon: Users },
  { label: 'Average Rating', value: '4.9 / 5', icon: Star },
];

const SUGGESTIONS = ['Website design', 'Logo design', 'Photography', 'House cleaning', 'Personal trainer', 'SEO Marketing', 'Video editing', 'Garden care'];

export default function LandingPage() {
  const { navigate } = useLocation();
  const [query, setQuery] = useState('');
  useDocumentTitle();

  // UTM parameter tracking for SEA campaigns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      content: params.get('utm_content'),
      term: params.get('utm_term'),
    };
    if (utm.source && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_title: 'Landing',
        campaign_source: utm.source,
        campaign_medium: utm.medium,
        campaign_name: utm.campaign,
        campaign_content: utm.content,
        campaign_term: utm.term,
      });
    }
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    sectionsRef.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const observe = (id: string) => (el: HTMLElement | null) => {
    if (el) {
      sectionsRef.current.set(id, el);
      el.id = id;
    }
  };

  const handleSearch = (q?: string) => {
    const term = q || query;
    if (term.trim()) navigate(`/jobs?q=${encodeURIComponent(term.trim())}`);
  };

  const filteredSuggestions = SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()) && s.toLowerCase() !== query.toLowerCase());

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 pb-20">
        {/* Large logo in top-left */}
        <Link to="/" className="absolute top-6 left-6 z-30">
          <img src="/spotrr.png" alt="spotrr.png" className="w-48 sm:w-56 md:w-72 h-auto object-contain shadow-md" />
        </Link>
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] max-w-3xl max-h-3xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800/40 dark:to-neutral-900/20 morph-blob opacity-60 dark:opacity-30" />
          <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] max-w-2xl max-h-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/10 animate-morph-reverse animate-morph-slow opacity-50 dark:opacity-20" style={{ animationDelay: '-4s' }} />
          <div className="absolute top-1/3 right-1/4 w-[25vw] h-[25vw] max-w-md max-h-md bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/50 dark:to-neutral-800/30 morph-blob opacity-40 dark:opacity-15" style={{ animationDelay: '-2s', animationDuration: '10s' }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full px-4 py-2 mb-8 shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse-soft" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">42,000+ verified professionals ready</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.05] mb-6 animate-fade-up text-balance" style={{ animationDelay: '0.2s' }}>
            Find the right{' '}
            <span className="relative">
              <span className="text-gradient">talent</span>
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-400 dark:via-neutral-600 to-transparent" />
            </span>
            {' '}for<br />any project
          </h1>

          <p className="text-lg md:text-xl text-neutral-500 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up text-balance" style={{ animationDelay: '0.3s' }}>
            Spotr connects you with verified freelancers and businesses across 13+ categories. Quality-assured, identity-verified, and rated by thousands.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 focus-within:shadow-xl transition-all duration-300">
              <Search size={20} className="ml-5 text-neutral-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="What service do you need?"
                className="flex-1 bg-transparent px-4 py-4 text-base text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
              />
              <button
                onClick={() => handleSearch()}
                className="m-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl px-5 py-3 text-sm font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-all duration-200 active:scale-95 flex items-center gap-2"
              >
                Search
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && query.length > 0 && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 card shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-20 animate-scale-in">
                {filteredSuggestions.slice(0, 5).map(s => (
                  <button
                    key={s}
                    onMouseDown={() => { setQuery(s); handleSearch(s); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                  >
                    <Search size={14} className="text-neutral-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <span className="text-xs text-neutral-400 self-center">Popular:</span>
            {['Web Design', 'Photography', 'House Cleaning', 'SEO', 'Tutoring'].map(tag => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); handleSearch(tag); }}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all duration-200"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <span className="text-xs text-neutral-400">Scroll to explore</span>
          <div className="w-6 h-9 border-2 border-neutral-300 dark:border-neutral-700 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2.5 bg-neutral-400 dark:bg-neutral-600 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                  <Icon size={20} className="text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{value}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        ref={observe('categories')}
        className={`py-14 md:py-24 transition-all duration-700 ${visibleSections.has('categories') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Every skill you need</h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              From digital services to home care, our verified professionals cover everything your business or home requires.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {CATEGORIES.map(({ name, icon: Icon, count, color, iconColor }, i) => (
              <button
                key={name}
                onClick={() => navigate(`/jobs?category=${name.toLowerCase().replace(' ', '-')}`)}
                className={`group relative p-4 rounded-2xl bg-gradient-to-br ${color} border border-white/60 dark:border-white/5 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-9 h-9 rounded-xl bg-white dark:bg-neutral-800/60 flex items-center justify-center mb-3 shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">{name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{count} pros</p>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/jobs" className="btn-secondary inline-flex items-center gap-2">
              Browse all categories <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        ref={observe('how')}
        className={`py-14 md:py-24 bg-neutral-50 dark:bg-neutral-900/20 transition-all duration-700 ${visibleSections.has('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">How Spotr works</h2>
            <p className="section-subtitle max-w-xl mx-auto">Three simple steps to get your project done right.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Describe your project', desc: 'Tell us what you need. Post a job in minutes with your budget, timeline, and requirements.', icon: Search },
              { step: '02', title: 'Get verified proposals', desc: 'Receive proposals from verified professionals. Review portfolios, ratings, and verified credentials.', icon: Shield },
              { step: '03', title: 'Hire and collaborate', desc: 'Chat, share files, and manage your project. Pay securely and leave a review when done.', icon: Zap },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative">
                <div className="card p-5 sm:p-8 h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-5">
                    <span className="text-5xl font-bold text-neutral-100 dark:text-neutral-800 leading-none">{step}</span>
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0 mt-1">
                      <Icon size={18} className="text-white dark:text-neutral-900" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">{title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
                </div>
                {step !== '03' && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight size={24} className="text-neutral-300 dark:text-neutral-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section
        ref={observe('trust')}
        className={`py-14 md:py-24 transition-all duration-700 ${visibleSections.has('trust') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-6">
                <Shield size={14} /> Trust & Safety
              </div>
              <h2 className="section-title mb-6">Verified professionals only</h2>
              <p className="section-subtitle mb-8">
                Every professional on Spotr goes through our rigorous verification process. We check identities, business registrations (KVK), and professional credentials.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Identity Verification', desc: 'Government ID checked for all freelancers' },
                  { title: 'KVK Business Verification', desc: 'Dutch Chamber of Commerce registration verified' },
                  { title: 'Portfolio Review', desc: 'Work samples reviewed by our quality team' },
                  { title: 'Community Reviews', desc: 'Ratings and reviews from real clients' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-success-100 dark:bg-success-700/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={14} className="text-success-600 dark:text-success-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/auth/register" className="btn-primary inline-flex items-center gap-2">
                  Start hiring <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Lisa de Boer', role: 'Web Designer', rating: 4.9, jobs: 89, badge: 'identity' },
                  { name: 'Marcus Klein', role: 'Photographer', rating: 5.0, jobs: 124, badge: 'kvk' },
                  { name: 'Sarah Johnson', role: 'SEO Expert', rating: 4.8, jobs: 67, badge: 'identity' },
                  { name: 'Tom van Dijk', role: 'Video Editor', rating: 4.9, jobs: 53, badge: 'identity' },
                ].map((pro, i) => (
                  <div key={pro.name} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar name={pro.name} size="md" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{pro.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{pro.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="badge-verified text-xs">
                        <CheckCircle size={9} /> Verified
                      </span>
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{pro.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-2">{pro.jobs} jobs completed</p>
                  </div>
                ))}
              </div>
              {/* Decorative blob */}
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800/30 dark:to-neutral-900/20 morph-blob -z-10 opacity-60" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        ref={observe('testimonials')}
        className={`py-14 md:py-24 bg-neutral-50 dark:bg-neutral-900/20 transition-all duration-700 ${visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Loved by thousands</h2>
            <p className="section-subtitle max-w-xl mx-auto">Join over 28,000 happy clients and professionals who trust Spotr.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className="card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{ transitionDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-5 line-clamp-3">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-auto">
                  <Avatar name={t.name} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.role}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600 font-medium">{t.project}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        ref={observe('cta')}
        className={`py-14 md:py-24 transition-all duration-700 ${visibleSections.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="relative bg-neutral-900 dark:bg-white rounded-3xl p-8 sm:p-12 md:p-16 overflow-hidden">
            {/* Decorative blobs inside CTA */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-white/5 dark:bg-neutral-900/5 morph-blob" />
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 dark:bg-neutral-900/5 animate-morph-reverse" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white dark:text-neutral-900 tracking-tight mb-4 text-balance">
                Ready to get started?
              </h2>
              <p className="text-base md:text-lg text-neutral-400 dark:text-neutral-500 mb-10 max-w-xl mx-auto leading-relaxed">
                Join 42,000+ professionals and businesses already using Spotr. Your first project is free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/auth/register"
                  className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold px-8 py-4 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 active:scale-95 inline-flex items-center gap-2 justify-center text-sm"
                >
                  Start for Free <ArrowRight size={16} />
                </Link>
                <Link
                  to="/freelancers"
                  className="bg-transparent border border-white/20 dark:border-neutral-900/20 text-white dark:text-neutral-900 font-semibold px-8 py-4 rounded-xl hover:bg-white/10 dark:hover:bg-neutral-900/10 transition-all duration-200 inline-flex items-center gap-2 justify-center text-sm"
                >
                  Browse Talent
                </Link>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6">No credit card required. Free forever on the basic plan.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
