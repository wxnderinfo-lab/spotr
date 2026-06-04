import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?: boolean;
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const dotSizes = {
  xs: 'w-1.5 h-1.5 ring-1',
  sm: 'w-2 h-2 ring-1',
  md: 'w-2.5 h-2.5 ring-1',
  lg: 'w-3.5 h-3.5 ring-2',
  xl: 'w-4 h-4 ring-2',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

function getColor(name: string) {
  const colors = [
    'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// Simple hash to detect URL changes for cache busting
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export default function Avatar({ src, name, size = 'md', className = '', online }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Validate URL is http/https to prevent javascript: injection
  const isValidUrl = src && /^https?:\/\//i.test(src);
  const imgSrc = isValidUrl && !imgError
    ? `${src}${src.includes('?') ? '&' : '?'}_v=${hashStr(src)}`
    : null;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} ${getColor(name)} rounded-full flex items-center justify-center font-semibold select-none`}>
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full ring-white dark:ring-neutral-950 ${online ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
      )}
    </div>
  );
}
