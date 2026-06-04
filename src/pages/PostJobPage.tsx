import { useState, useEffect } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createJob } from '../lib/queries';
import Header from '../components/Header';
import {
  ArrowLeft, Plus, X, Globe, MapPin, AlertCircle,
  CheckCircle, Loader, Lightbulb, Calendar, DollarSign
} from 'lucide-react';

const CATEGORIES_LIST = [
  'Websites', 'Design', 'Photography', 'Videography', 'Home Services',
  'Cleaning', 'Moving', 'Gardening', 'Tutoring', 'Sports Coaching',
  'Events', 'Repairs', 'Marketing',
];

const SUGGESTED_SKILLS: Record<string, string[]> = {
  Websites: ['React', 'Vue.js', 'TypeScript', 'Node.js', 'WordPress', 'Shopify', 'PHP'],
  Design: ['Figma', 'Adobe XD', 'Illustrator', 'Photoshop', 'Branding', 'Logo Design'],
  Photography: ['Studio', 'Product Photography', 'Brand Photography', 'Lightroom', 'Portrait'],
  Videography: ['Adobe Premiere', 'Final Cut', 'DaVinci', 'After Effects', 'Color Grading'],
  Marketing: ['SEO', 'Google Ads', 'Meta Ads', 'Email Marketing', 'Analytics', 'Content Strategy'],
  Design_default: ['Branding', 'Typography', 'Print Design', 'Packaging'],
};

const STEPS = ['Job details', 'Requirements', 'Budget', 'Review'];

export default function PostJobPage() {
  const { navigate } = useLocation();
  const { user, profile } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [location, setLocation] = useState(profile?.location || '');
  const [remoteOk, setRemoteOk] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [deadline, setDeadline] = useState('');
  const [jobStatus, setJobStatus] = useState<'open' | 'draft'>('open');

  useEffect(() => {
    supabase.from('categories').select('id, name').order('sort_order').then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 15) {
      setSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
  };

  const validate = () => {
    if (step === 1) {
      if (!title.trim()) return setError('Job title is required') && false;
      if (title.length < 10) return setError('Title must be at least 10 characters') && false;
      if (!description.trim()) return setError('Description is required') && false;
      if (description.length < 50) return setError('Please provide a more detailed description (50+ chars)') && false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep(s => Math.min(s + 1, 4) as 1|2|3|4);
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/auth/login'); return; }
    setSaving(true);
    setError('');

    const { data, error } = await createJob({
      client_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || undefined,
      budget_type: budgetType,
      budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
      budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
      location: location.trim(),
      remote_ok: remoteOk,
      skills_required: skills,
      deadline: deadline || undefined,
      status: jobStatus,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    navigate(`/jobs/${data.id}`);
  };

  const suggestedSkills = SUGGESTED_SKILLS[categoryName] || [];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-8 transition-colors">
            <ArrowLeft size={15} /> Back to Jobs
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1">Post a Job</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Describe your project and receive proposals from verified professionals.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center mb-10 overflow-x-auto no-scrollbar">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={s} className="flex items-center flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : active ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    }`}>
                      {done ? '✓' : n}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-12 h-px mx-2 transition-colors ${done ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-2xl text-sm mb-6 animate-scale-in">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Job Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Build a modern e-commerce website"
                  className="input-base"
                  maxLength={100}
                />
                <p className="text-xs text-neutral-400 mt-1">{title.length}/100</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(categories.length > 0 ? categories : CATEGORIES_LIST.map(n => ({ id: n, name: n }))).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(cat.id); setCategoryName(cat.name); }}
                      className={`py-2.5 px-3 text-sm rounded-xl border-2 font-medium transition-all text-left ${
                        categoryId === cat.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white'
                          : 'border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you need. Include goals, deliverables, any specific requirements and what success looks like…"
                  rows={6}
                  className="input-base resize-none"
                  maxLength={3000}
                />
                <p className="text-xs text-neutral-400 mt-1">{description.length}/3000 — Aim for 100+ characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Requirements */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              {suggestedSkills.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    <Lightbulb size={12} /> Suggested for {categoryName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSkills.map(s => (
                      <button
                        key={s}
                        onClick={() => addSkill(s)}
                        disabled={skills.includes(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                          skills.includes(s)
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent opacity-60'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
                        }`}
                      >
                        {skills.includes(s) ? '✓ ' : '+ '}{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Required Skills</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={e => setCustomSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill(customSkill))}
                    placeholder="Add a skill…"
                    className="input-base flex-1"
                  />
                  <button onClick={() => addSkill(customSkill)} className="btn-secondary flex items-center gap-1.5 flex-shrink-0">
                    <Plus size={15} /> Add
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <span key={s} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full">
                        {s}
                        <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="hover:opacity-70 transition-opacity">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">
                  <MapPin size={11} className="inline mr-1" />Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Amsterdam, Netherlands"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Work Arrangement</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: true, label: 'Remote OK', sub: 'Work from anywhere', icon: Globe },
                    { value: false, label: 'On-site only', sub: 'Must be at location', icon: MapPin },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setRemoteOk(opt.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        remoteOk === opt.value
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900'
                          : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <opt.icon size={16} className={remoteOk === opt.value ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'} />
                      <div>
                        <p className={`text-sm font-medium ${remoteOk === opt.value ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</p>
                        <p className="text-xs text-neutral-400">{opt.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Budget Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'fixed', label: 'Fixed Price', desc: 'One-time payment' },
                    { value: 'hourly', label: 'Hourly Rate', desc: 'Pay per hour worked' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setBudgetType(opt.value as 'fixed' | 'hourly')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        budgetType === opt.value
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900'
                          : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${budgetType === opt.value ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: `Min ${budgetType === 'hourly' ? '(€/hr)' : '(€)'}`, value: budgetMin, set: setBudgetMin, placeholder: budgetType === 'hourly' ? '25' : '500' },
                  { label: `Max ${budgetType === 'hourly' ? '(€/hr)' : '(€)'}`, value: budgetMax, set: setBudgetMax, placeholder: budgetType === 'hourly' ? '100' : '5000' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">{field.label}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">€</span>
                      <input
                        type="number"
                        value={field.value}
                        onChange={e => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        min="0"
                        className="input-base pl-8"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">
                  <Calendar size={11} className="inline mr-1" />Deadline (optional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Publish</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'open', label: 'Publish Now', desc: 'Visible to all freelancers' },
                    { v: 'draft', label: 'Save as Draft', desc: 'Publish when you\'re ready' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setJobStatus(opt.v as 'open' | 'draft')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${jobStatus === opt.v ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300'}`}
                    >
                      <p className={`text-sm font-semibold ${jobStatus === opt.v ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{opt.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-up">
              <div className="card p-6 space-y-5">
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-1">Title</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">{title}</p>
                </div>
                {categoryName && (
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-1">Category</p>
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm">{categoryName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-1">Description</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-4">{description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-1">Budget</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {budgetMin || budgetMax
                        ? `€${budgetMin || '?'} – €${budgetMax || '?'}${budgetType === 'hourly' ? '/hr' : ''}`
                        : 'Open'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-1">Location</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{location || 'Anywhere'} {remoteOk ? '· Remote OK' : ''}</p>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-semibold mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => (
                        <span key={s} className="px-2.5 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${jobStatus === 'open' ? 'bg-green-50 dark:bg-green-700/20 text-green-700 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                    {jobStatus === 'open' ? <CheckCircle size={11} /> : null}
                    {jobStatus === 'open' ? 'Will be published immediately' : 'Will be saved as draft'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-neutral-100 dark:border-neutral-800">
            {step > 1
              ? <button onClick={() => { setStep(s => Math.max(s - 1, 1) as 1|2|3|4); setError(''); }} className="btn-ghost">Back</button>
              : <button onClick={() => navigate('/jobs')} className="btn-ghost text-neutral-400">Cancel</button>
            }
            {step < 4 ? (
              <button onClick={handleNext} className="btn-primary">Continue</button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader size={15} className="animate-spin" /> Publishing…</> : jobStatus === 'open' ? 'Publish Job' : 'Save Draft'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
