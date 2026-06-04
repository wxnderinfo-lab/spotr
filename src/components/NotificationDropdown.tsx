import { useEffect, useRef } from 'react';
import { Bell, Briefcase, MessageSquare, Star, CheckCircle, Loader } from 'lucide-react';
import { Link } from './Router';
import type { Notification } from '../lib/supabase';

const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  message: MessageSquare,
  application: Briefcase,
  review: Star,
  verification: CheckCircle,
  default: Bell,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

interface Props {
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export default function NotificationDropdown({ onClose, notifications, loading, markRead, markAllRead }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="fixed top-16 left-3 right-3 z-50 md:absolute md:top-full md:mt-2 md:w-80 md:right-0 md:left-auto card shadow-xl border border-neutral-200 dark:border-neutral-700 animate-scale-in overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Notifications</h3>
        <button
          onClick={markAllRead}
          className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
        >
          Mark all read
        </button>
      </div>

      <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={20} className="animate-spin text-neutral-300 dark:text-neutral-700" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
              <Bell size={18} className="text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No notifications yet</p>
            <p className="text-xs text-neutral-400 mt-1">We'll let you know when something happens</p>
          </div>
        ) : (
          notifications.slice(0, 15).map(n => {
            const Icon = icons[n.type] || icons.default;
            return (
              <Link
                key={n.id}
                to={n.link || '/dashboard'}
                onClick={() => { markRead(n.id); onClose(); }}
                className={`flex items-start gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                  <Icon size={14} className={!n.is_read ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${!n.is_read ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{n.body}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-neutral-400">{timeAgo(n.created_at)}</span>
                  {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
        <Link to="/dashboard" onClick={onClose} className="text-xs text-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium block transition-colors">
          View all notifications
        </Link>
      </div>
    </div>
  );
}
