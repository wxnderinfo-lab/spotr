import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from './Router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import {
  Search, Bell, Menu, X, Sun, Moon, ChevronDown,
  User, Settings, LogOut, Briefcase, MessageSquare, LayoutDashboard, Shield
} from 'lucide-react';
import Avatar from './ui/Avatar';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();
  const { notifications, unreadCount, loading: loadingNotifs, markRead, markAllRead } = useNotifications(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isLanding = pathname === '/';
  const headerBg = scrolled || !isLanding
    ? 'glass border-b border-neutral-200/60 dark:border-neutral-800/60'
    : 'bg-transparent border-b border-transparent';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/spotrr.png" alt="spotrr.png" className="w-8 h-8 rounded-xl object-contain transition-transform duration-200 group-hover:scale-105" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/jobs" className={`nav-link px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${pathname === '/jobs' ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800' : ''}`}>
              Browse Jobs
            </Link>
            <Link to="/freelancers" className={`nav-link px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${pathname === '/freelancers' ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800' : ''}`}>
              Find Talent
            </Link>
            <Link to="/pricing" className={`nav-link px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 ${pathname === '/pricing' ? 'text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800' : ''}`}>
              Pricing
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                    className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 relative"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <NotificationDropdown
                      onClose={() => setNotifOpen(false)}
                      notifications={notifications}
                      loading={loadingNotifs}
                      markRead={markRead}
                      markAllRead={markAllRead}
                    />
                  )}
                </div>

                {/* Messages */}
                <Link to="/messages" className="hidden sm:flex p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200">
                  <MessageSquare size={18} />
                </Link>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                  >
                    <Avatar src={profile?.avatar_url} name={profile?.full_name || profile?.email || ''} size="sm" />
                    <span className="hidden sm:block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {profile?.full_name?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown size={14} className={`text-neutral-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 card shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 animate-scale-in">
                      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{profile?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <LayoutDashboard size={15} /> Dashboard
                        </Link>
                        <Link to={`/profile/${profile?.username || profile?.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <User size={15} /> My Profile
                        </Link>
                        <Link to="/messages" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <MessageSquare size={15} /> Messages
                        </Link>
                        {profile?.user_type !== 'client' && (
                          <Link to="/jobs/post" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <Briefcase size={15} /> Post a Job
                          </Link>
                        )}
                        {profile?.user_type === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <Shield size={15} /> Admin
                          </Link>
                        )}
                        <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <Settings size={15} /> Settings
                        </Link>
                      </div>
                      <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/auth/login" className="btn-ghost">Sign In</Link>
                <Link to="/auth/register" className="btn-primary">Get Started</Link>
              </div>
            )}

            {/* Mobile menu — only shown when logged out */}
            {!user && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-neutral-200/60 dark:border-neutral-800/60 animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            <Link to="/jobs" className="block px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">Browse Jobs</Link>
            <Link to="/freelancers" className="block px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">Find Talent</Link>
            <Link to="/pricing" className="block px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">Pricing</Link>
            {!user && (
              <div className="flex gap-2 pt-2">
                <Link to="/auth/login" className="flex-1 btn-secondary text-center">Sign In</Link>
                <Link to="/auth/register" className="flex-1 btn-primary text-center">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
