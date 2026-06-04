import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link } from './Router';
import { useNotifications } from '../hooks/useNotifications';
import {
  LayoutDashboard, Briefcase, Plus, MessageSquare, User,
  LogIn, Users, Home, Bookmark, Search
} from 'lucide-react';

export default function BottomNav() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const { unreadCount } = useNotifications(user?.id);

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');

  const isFreelancer = profile?.user_type === 'freelancer';

  const tabBase = 'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150';
  const tabActive = 'text-neutral-900 dark:text-white';
  const tabInactive = 'text-neutral-400 dark:text-neutral-500';

  if (user) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-stretch h-[56px]">

          <Link to="/dashboard" className={`${tabBase} ${isActive('/dashboard') ? tabActive : tabInactive}`}>
            <LayoutDashboard size={22} strokeWidth={isActive('/dashboard') ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {isFreelancer ? (
            <Link to="/jobs" className={`${tabBase} ${isActive('/jobs') ? tabActive : tabInactive}`}>
              <Search size={22} strokeWidth={isActive('/jobs') ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">Find Work</span>
            </Link>
          ) : (
            <Link to="/freelancers" className={`${tabBase} ${isActive('/freelancers') ? tabActive : tabInactive}`}>
              <Users size={22} strokeWidth={isActive('/freelancers') ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">Talent</span>
            </Link>
          )}

          {/* Center CTA */}
          {isFreelancer ? (
            <Link to="/jobs" className={`${tabBase}`}>
              <div className="w-12 h-12 -mt-4 bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform duration-100">
                <Bookmark size={20} className="text-neutral-600 dark:text-neutral-300" strokeWidth={2} />
              </div>
            </Link>
          ) : (
            <Link to="/jobs/post" className={`${tabBase}`}>
              <div className="w-12 h-12 -mt-4 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/20 dark:shadow-neutral-100/10 active:scale-95 transition-transform duration-100">
                <Plus size={22} className="text-white dark:text-neutral-900" strokeWidth={2.5} />
              </div>
            </Link>
          )}

          <Link to="/messages" className={`${tabBase} relative ${isActive('/messages') ? tabActive : tabInactive}`}>
            <div className="relative">
              <MessageSquare size={22} strokeWidth={isActive('/messages') ? 2.2 : 1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Messages</span>
          </Link>

          <Link
            to={`/profile/${profile?.username || profile?.id}`}
            className={`${tabBase} ${pathname.startsWith('/profile') ? tabActive : tabInactive}`}
          >
            <User size={22} strokeWidth={pathname.startsWith('/profile') ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>

        </div>
        <div className="h-safe-bottom" />
      </nav>
    );
  }

  // Logged-out bottom nav
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80">
      <div className="flex items-stretch h-[56px]">
        <Link to="/" className={`${tabBase} ${isActive('/') ? tabActive : tabInactive}`}>
          <Home size={22} strokeWidth={isActive('/') ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link to="/jobs" className={`${tabBase} ${isActive('/jobs') ? tabActive : tabInactive}`}>
          <Briefcase size={22} strokeWidth={isActive('/jobs') ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium">Jobs</span>
        </Link>
        <Link to="/freelancers" className={`${tabBase} ${isActive('/freelancers') ? tabActive : tabInactive}`}>
          <Users size={22} strokeWidth={isActive('/freelancers') ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium">Talent</span>
        </Link>
        <Link to="/auth/register" className={`${tabBase} ${isActive('/auth/register') ? tabActive : tabInactive}`}>
          <div className="w-12 h-12 -mt-4 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/20 active:scale-95 transition-transform duration-100">
            <span className="text-white dark:text-neutral-900 text-xs font-bold">Join</span>
          </div>
        </Link>
        <Link to="/auth/login" className={`${tabBase} ${isActive('/auth/login') ? tabActive : tabInactive}`}>
          <LogIn size={22} strokeWidth={isActive('/auth/login') ? 2.2 : 1.8} />
          <span className="text-[10px] font-medium">Sign In</span>
        </Link>
      </div>
      <div className="h-safe-bottom" />
    </nav>
  );
}
