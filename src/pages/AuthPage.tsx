import { useState, useEffect } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle,
  User, Building2, Briefcase, Mail, ArrowRight, Loader
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot';
type UserTypeChoice = 'client' | 'freelancer' | 'business';

const USER_TYPES: { type: UserTypeChoice; icon: React.ComponentType<any>; title: string; desc: string }[] = [
  { type: 'client',     icon: User,      title: 'Client',     desc: 'Hire talent for your projects' },
  { type: 'freelancer', icon: Briefcase, title: 'Freelancer', desc: 'Offer your services & grow' },
  { type: 'business',   icon: Building2, title: 'Business',   desc: 'Scale with verified talent' },
];

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { navigate } = useLocation();
  const { signIn, signUp, updateProfile, user, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<UserTypeChoice>('client');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationSent, setConfirmationSent] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user && profile) {
      if (!profile.onboarding_completed) navigate('/onboarding');
      else navigate('/dashboard');
    }
  }, [user, profile]);

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const validateStep1 = () => {
    if (isRegister && !fullName.trim()) { setError('Please enter your full name'); return false; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address'); return false; }
    if (!isForgot && password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (!validateStep1() && step === 1) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Incorrect email or password. Please try again.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Please check your email inbox and confirm your account first.');
          } else {
            setError(error.message);
          }
          return;
        }
        navigate('/dashboard');
      } else if (isRegister) {
        const { error, needsConfirmation, userId } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            setError('An account with this email already exists. Try signing in instead.');
          } else {
            setError(error.message);
          }
          return;
        }
        if (needsConfirmation) {
          setConfirmationSent(true);
        } else if (userId) {
          // Email confirmation disabled — session is live, set user_type directly
          await supabase.from('profiles').update({ user_type: userType }).eq('id', userId);
          // onAuthStateChange will trigger and redirect via useEffect
        }
      } else {
        setSuccess('If an account exists with that email, you\'ll receive a password reset link shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="w-16 h-16 bg-success-50 dark:bg-success-700/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-success-600 dark:text-success-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Check your inbox</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong className="text-neutral-900 dark:text-white">{email}</strong>.
            Click the link in the email to activate your account, then sign in.
          </p>
          <p className="text-xs text-neutral-400 mb-8">
            No email? Check your spam folder, or{' '}
            <button onClick={() => setConfirmationSent(false)} className="text-neutral-600 dark:text-neutral-300 hover:underline">try again</button>.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate('/auth/login')} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              Go to Sign In <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/')} className="btn-ghost w-full py-3">Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-neutral-950 dark:bg-neutral-900 flex-shrink-0">
        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-white/[0.03] morph-blob" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-white/[0.03] animate-morph-reverse" />
          <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-white/[0.02] morph-blob" style={{ animationDelay: '-3s' }} />
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-neutral-900 font-bold text-base">S</span>
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Spotr</span>
          </Link>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">
              {isLogin ? 'Welcome back' : 'Get started'}
            </p>
            <h2 className="text-4xl font-bold text-white leading-[1.15] mb-5 text-balance">
              {isLogin
                ? 'Your next great collaboration starts here'
                : 'Join 42,000+ verified professionals'}
            </h2>
            <p className="text-white/50 leading-relaxed text-sm max-w-xs mb-10">
              {isLogin
                ? 'Access your dashboard, messages, and job opportunities.'
                : 'Connect with clients, grow your business, and do work you love.'}
            </p>

            <div className="space-y-3.5">
              {[
                { text: 'Verified professionals only' },
                { text: 'Secure messaging & payments' },
                { text: 'Cancel subscriptions anytime' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={12} className="text-white/70" />
                  </div>
                  <span className="text-sm text-white/60">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['Emma', 'Marcus', 'Lisa', 'Tom'].map(n => (
                <div key={n} className="w-8 h-8 rounded-full bg-white/10 border-2 border-neutral-950 flex items-center justify-center text-xs font-semibold text-white/80">
                  {n[0]}
                </div>
              ))}
            </div>
            <span className="text-xs text-white/40">312 joined this month</span>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center">
              <span className="text-white dark:text-neutral-900 font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">Spotr</span>
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {isRegister && step === 2 && (
            <button onClick={() => { setStep(1); setError(''); }} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-7 transition-colors -ml-1">
              <ArrowLeft size={15} /> Back
            </button>
          )}

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1.5">
              {isLogin ? 'Sign in to Spotr' : isForgot ? 'Reset your password' : step === 1 ? 'Create your account' : 'You are a…'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {isLogin && <>No account? <Link to="/auth/register" className="text-neutral-900 dark:text-white font-semibold hover:underline">Sign up free</Link></>}
              {isRegister && step === 1 && <>Already have one? <Link to="/auth/login" className="text-neutral-900 dark:text-white font-semibold hover:underline">Sign in</Link></>}
              {isRegister && step === 2 && 'Choose the option that best describes you.'}
            </p>
          </div>

          {/* Progress bar for register */}
          {isRegister && (
            <div className="flex gap-1.5 mb-8">
              {[1, 2].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
              ))}
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-2xl text-sm mb-5 animate-scale-in">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success alert */}
          {success && (
            <div className="flex items-start gap-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3.5 rounded-2xl text-sm mb-5 animate-scale-in">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Step 2: User type selection */}
          {isRegister && step === 2 ? (
            <div className="space-y-4 animate-fade-up">
              <div className="space-y-3">
                {USER_TYPES.map(({ type, icon: Icon, title, desc }) => (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      userType === type
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/5'
                        : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      userType === type ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'
                    }`}>
                      <Icon size={18} className={userType === type ? 'text-white dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${userType === type ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>{title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{desc}</p>
                    </div>
                    <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      userType === type ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {userType === type && <div className="w-2 h-2 rounded-full bg-white dark:bg-neutral-900" />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit as unknown as React.MouseEventHandler}
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-semibold mt-2"
              >
                {loading ? <><Loader size={16} className="animate-spin" /> Creating account…</> : <>Create Account <ArrowRight size={16} /></>}
              </button>

              <p className="text-center text-xs text-neutral-400 leading-relaxed">
                By continuing you agree to our{' '}
                <Link to="/terms" className="text-neutral-600 dark:text-neutral-300 hover:underline">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-neutral-600 dark:text-neutral-300 hover:underline">Privacy Policy</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" noValidate>
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 uppercase tracking-wide">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="input-base"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-base"
                  autoComplete="email"
                />
              </div>

              {!isForgot && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">Password</label>
                    {isLogin && (
                      <Link to="/auth/forgot" className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors">
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isRegister ? 'Min. 6 characters' : '••••••••'}
                      className="input-base pr-11"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-0.5"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {isRegister && password.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          password.length >= i * 3 ? password.length >= 10 ? 'bg-green-500' : password.length >= 6 ? 'bg-amber-400' : 'bg-red-400' : 'bg-neutral-100 dark:bg-neutral-800'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-semibold !mt-6"
              >
                {loading ? (
                  <><Loader size={16} className="animate-spin" /> {isLogin ? 'Signing in…' : isForgot ? 'Sending…' : 'Continuing…'}</>
                ) : (
                  <>{isLogin ? 'Sign In' : isForgot ? 'Send Reset Link' : 'Continue'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
