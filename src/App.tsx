import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Router, useLocation } from './components/Router';

import BottomNav from './components/BottomNav';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import PostJobPage from './pages/PostJobPage';
import JobDetailPage from './pages/JobDetailPage';
import FreelancersPage from './pages/FreelancersPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import PricingPage from './pages/PricingPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

function PageRouter() {
  const { pathname } = useLocation();
  const { user, profile, loading } = useAuth();

  // Track page views in GA4 on route change
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname]);

  // Route matching
  const isExact = (path: string) => pathname === path;
  const startsWith = (path: string) => pathname.startsWith(path);

  // Extract dynamic segments
  const profileMatch = pathname.match(/^\/profile\/(.+)$/);
  const jobDetailMatch = pathname.match(/^\/jobs\/(?!post)(.+)$/);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center animate-pulse-soft">
            <span className="text-white dark:text-neutral-900 font-bold text-sm">S</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Landing
  if (isExact('/')) return <LandingPage />;

  // Auth
  if (isExact('/auth/login')) return <AuthPage mode="login" />;
  if (isExact('/auth/register')) return <AuthPage mode="register" />;
  if (isExact('/auth/forgot')) return <AuthPage mode="forgot" />;

  // Onboarding (requires auth)
  if (isExact('/onboarding')) {
    if (!user) return <AuthPage mode="register" />;
    return <OnboardingPage />;
  }

  // Dashboard (requires auth)
  if (isExact('/dashboard')) {
    if (!user) return <AuthPage mode="login" />;
    return <DashboardPage />;
  }

  // Jobs
  if (isExact('/jobs')) return <JobsPage />;
  if (isExact('/jobs/post')) {
    if (!user) return <AuthPage mode="login" />;
    if (profile?.user_type === 'freelancer') return <JobsPage />;
    return <PostJobPage />;
  }
  if (jobDetailMatch) return <JobDetailPage jobId={jobDetailMatch[1]} />;

  // Freelancers
  if (isExact('/freelancers')) return <FreelancersPage />;

  // Profile
  if (profileMatch) return <ProfilePage username={profileMatch[1]} />;

  // Messages (requires auth)
  if (isExact('/messages') || startsWith('/messages/')) {
    if (!user) return <AuthPage mode="login" />;
    return <MessagesPage />;
  }

  // Pricing
  if (isExact('/pricing')) return <PricingPage />;

  // Admin (requires auth + admin role)
  if (startsWith('/admin')) {
    if (!user) return <AuthPage mode="login" />;
    return <AdminPage />;
  }

  // Settings (requires auth)
  if (isExact('/settings')) {
    if (!user) return <AuthPage mode="login" />;
    return <SettingsPage />;
  }
  if (isExact('/settings/verify')) {
    if (!user) return <AuthPage mode="login" />;
    return <SettingsPage initialTab="verify" />;
  }
  if (isExact('/settings/billing')) {
    if (!user) return <AuthPage mode="login" />;
    return <SettingsPage initialTab="billing" />;
  }

  // Legal pages
  if (isExact('/terms')) return <TermsPage />;
  if (isExact('/privacy')) return <PrivacyPage />;

  // 404 fallback
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-bold text-neutral-100 dark:text-neutral-800 mb-4">404</p>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" className="btn-primary inline-flex">Go Home</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="mobile-nav-clearance md:pb-0">
            <PageRouter />
          </div>
          <BottomNav />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
