import { Star, CheckCircle } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

export default function StarRating({ rating, count, size = 'sm', showCount = true }: StarRatingProps) {
  const starSize = size === 'sm' ? 12 : 16;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={starSize}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 dark:text-neutral-700 fill-neutral-200 dark:fill-neutral-700'}
        />
      ))}
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-neutral-500 dark:text-neutral-400 ml-0.5`}>
        {rating.toFixed(1)}{showCount && count !== undefined && ` (${count})`}
      </span>
    </div>
  );
}

interface VerifiedBadgeProps {
  type?: 'identity' | 'kvk' | 'premium';
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ type = 'identity', size = 'sm' }: VerifiedBadgeProps) {
  const labels = { identity: 'Verified', kvk: 'KVK Verified', premium: 'Premium' };
  return (
    <span className={`badge-verified ${size === 'md' ? 'text-sm px-3 py-1.5' : ''}`}>
      <CheckCircle size={size === 'sm' ? 10 : 14} />
      {labels[type]}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full shimmer-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded shimmer-bg" />
          <div className="h-3 w-24 rounded shimmer-bg" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded shimmer-bg" />
        <div className="h-3 w-4/5 rounded shimmer-bg" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full shimmer-bg" />
        <div className="h-6 w-20 rounded-full shimmer-bg" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
        <Icon size={28} className="text-neutral-400 dark:text-neutral-600" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  );
}
