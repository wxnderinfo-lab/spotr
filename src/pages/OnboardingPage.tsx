import { useState } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, ArrowRight, Camera, MapPin, Globe, Briefcase, Star, Upload } from 'lucide-react';

const STEPS_FREELANCER = [
  { id: 1, title: 'Build your profile', subtitle: 'Help clients find and trust you' },
  { id: 2, title: 'Skills & rate', subtitle: 'Showcase your expertise' },
  { id: 3, title: 'Preferences', subtitle: 'How you want to work' },
  { id: 4, title: "You're all set!", subtitle: 'Start finding great work' },
];

const STEPS_CLIENT = [
  { id: 1, title: 'Set up your account', subtitle: 'Help freelancers know who they are working with' },
  { id: 2, title: 'Preferences', subtitle: 'Customize your experience' },
  { id: 3, title: "You're all set!", subtitle: 'Start hiring great talent' },
];

const ALL_SKILLS = [
  'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Django', 'PHP', 'Laravel',
  'UI/UX Design', 'Figma', 'Adobe XD', 'Illustrator', 'Photoshop', 'Motion Design',
  'Photography', 'Videography', 'Video Editing', 'SEO', 'Google Ads', 'Social Media',
  'Content Writing', 'Translation', 'Tutoring', 'Music', 'Event Planning',
  'Interior Design', 'Cleaning', 'Gardening', 'Moving', 'Personal Training',
];

export default function OnboardingPage() {
  const { navigate } = useLocation();
  const { profile, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');

  const isClient = profile?.user_type === 'client' || profile?.user_type === 'business';
  const STEPS = isClient ? STEPS_CLIENT : STEPS_FREELANCER;
  const totalSteps = STEPS.length;

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      return;
    }
    setLoading(true);
    await updateProfile({ bio, location, website, onboarding_completed: true });
    setLoading(false);
    setStep(totalSteps);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl });
      setAvatarUrl(data.publicUrl);
    }
    setAvatarUploading(false);
  };

  const toggleSkill = (s: string) => {
    setSelectedSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (step === totalSteps) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-success-100 dark:bg-success-700/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <CheckCircle size={40} className="text-success-600 dark:text-success-400" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-3">Welcome to Spotr!</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
            Your profile is ready. {profile?.user_type === 'freelancer' ? 'Start applying to jobs and grow your career.' : 'Start finding amazing talent for your projects.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2 justify-center">
              Go to Dashboard <ArrowRight size={16} />
            </button>
            {isClient ? (
              <button onClick={() => navigate('/freelancers')} className="btn-secondary">
                Find Talent
              </button>
            ) : (
              <button onClick={() => navigate('/jobs')} className="btn-secondary">
                Browse Jobs
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center">
              <span className="text-white dark:text-neutral-900 font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">Spotr</span>
          </Link>
          <span className="text-sm text-neutral-400">Step {step} of {totalSteps - 1}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500"
            style={{ width: `${((step) / (totalSteps - 1)) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{STEPS[step - 1].title}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">{STEPS[step - 1].subtitle}</p>

          {step === 1 && (
            <div className="space-y-5">
              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <label className="relative cursor-pointer group flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-600 overflow-hidden flex flex-col items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : avatarUploading ? (
                      <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera size={20} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 mb-1" />
                        <span className="text-xs text-neutral-400 text-center leading-tight">Add photo</span>
                      </>
                    )}
                  </div>
                  {avatarUrl && (
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-950">
                      <Camera size={11} className="text-white dark:text-neutral-900" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
                  />
                </label>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Profile photo</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">A photo increases trust by 80%</p>
                  {avatarUrl && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Photo added!</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={isClient
                    ? 'Describe your company or the types of projects you typically hire for...'
                    : 'Tell clients about yourself, your experience, and what makes you unique...'}
                  rows={4}
                  className="input-base resize-none"
                />
                <p className="text-xs text-neutral-400 mt-1">{bio.length}/500 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <MapPin size={14} className="inline mr-1" />Location
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <Globe size={14} className="inline mr-1" />Website (optional)
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="input-base"
                />
              </div>
            </div>
          )}

          {step === 2 && !isClient && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <Briefcase size={14} className="inline mr-1" />Hourly rate (€)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">€</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    placeholder="50"
                    className="input-base pl-8"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  <Star size={14} className="inline mr-1" />Skills & Expertise
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SKILLS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150 ${
                        selectedSkills.includes(skill)
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                          : 'bg-transparent border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {selectedSkills.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-2">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  <Upload size={14} className="inline mr-1" />Portfolio (optional)
                </label>
                <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer">
                  <Upload size={24} className="text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Drag & drop files or click to upload</p>
                  <p className="text-xs text-neutral-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
            </div>
          )}

          {step === (isClient ? 2 : 3) && (
            <div className="space-y-5">
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">Email notifications</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">New messages and opportunities</p>
                  </div>
                  <div className="w-11 h-6 bg-neutral-900 dark:bg-white rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white dark:bg-neutral-900 rounded-full absolute right-1 top-1 transition-transform" />
                  </div>
                </div>
                <hr className="border-neutral-100 dark:border-neutral-800" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">Job recommendations</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Personalized job alerts</p>
                  </div>
                  <div className="w-11 h-6 bg-neutral-900 dark:bg-white rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white dark:bg-neutral-900 rounded-full absolute right-1 top-1" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Dark mode</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Choose your preferred appearance</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Light', 'Dark'].map(mode => (
                    <button key={mode} className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${mode === 'Light' ? 'border-neutral-900 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'border-neutral-200 dark:border-neutral-900 bg-neutral-900 dark:bg-neutral-950 text-white'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="btn-ghost">
              Back
            </button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="btn-ghost text-neutral-400">
              Skip for now
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? 'Saving...' : step < totalSteps - 1 ? 'Continue' : 'Finish setup'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
