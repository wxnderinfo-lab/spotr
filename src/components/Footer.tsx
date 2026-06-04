import { Link } from './Router';
import { Globe, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = {
    Platform: [
      { label: 'Browse Jobs', href: '/jobs' },
      { label: 'Find Talent', href: '/freelancers' },
      { label: 'Post a Job', href: '/jobs/post' },
      { label: 'Pricing', href: '/pricing' },
    ],
    Company: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
    Support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Trust & Safety', href: '/trust' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  };

  return (
    <footer className="hidden md:block border-t border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-white dark:text-neutral-900 font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">Spotr</span>
            </Link>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mb-6">
              The premium marketplace connecting businesses and individuals with verified freelancers and service providers.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Linkedin, Instagram, Globe].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-500 transition-all duration-200">
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4">{section}</h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.href}>
                    <Link to={item.href} className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            © {year} Spotr. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-600">
            <span>Made with</span>
            <span className="text-neutral-700 dark:text-neutral-300">♥</span>
            <span>in the Netherlands</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
