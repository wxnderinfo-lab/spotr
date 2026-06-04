import { useState } from 'react';
import { Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, ArrowRight, Zap, Crown, Sparkles, X } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for occasional hiring or getting started as a freelancer.',
    icon: Sparkles,
    badge: null,
    features: [
      'Post up to 2 jobs/month',
      'Apply to 5 jobs/month',
      'Basic profile page',
      'Standard messaging',
      'Public listing',
      null,
      null,
      null,
    ],
    cta: 'Get Started Free',
    ctaVariant: 'secondary' as const,
  },
  {
    name: 'Pro',
    price: 19,
    period: 'per month',
    description: 'For active freelancers and growing businesses ready to scale.',
    icon: Zap,
    badge: 'Most Popular',
    features: [
      'Post unlimited jobs',
      'Unlimited applications',
      'Enhanced profile with portfolio',
      'Priority messaging',
      'Featured in search results',
      'Verified Pro badge',
      'Analytics & insights',
      null,
    ],
    cta: 'Start Pro Trial',
    ctaVariant: 'primary' as const,
  },
  {
    name: 'Premium',
    price: 49,
    period: 'per month',
    description: 'For serious professionals and businesses who demand the best.',
    icon: Crown,
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      'Top placement in searches',
      'Premium verified badge',
      'Dedicated account manager',
      'KVK business verification',
      'Custom profile URL',
      'Advanced analytics',
      'Priority support 24/7',
    ],
    cta: 'Start Premium Trial',
    ctaVariant: 'primary' as const,
  },
];

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.' },
  { q: 'Is there a free trial for paid plans?', a: 'Yes! Both Pro and Premium plans come with a 14-day free trial. No credit card required to start.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, iDEAL (Netherlands), SEPA bank transfers, and PayPal.' },
  { q: 'Can I switch between plans?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
  { q: 'What is KVK verification?', a: 'KVK is the Dutch Chamber of Commerce register. We verify your business registration to build trust with potential clients.' },
];

export default function PricingPage() {
  const { user, profile } = useAuth();
  const [annual, setAnnual] = useState(false);
  useDocumentTitle('Pricing');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const discount = 0.2;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full px-4 py-2 mb-6">
              <Zap size={14} className="text-neutral-600 dark:text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Simple, transparent pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4 text-balance">
              Choose your plan
            </h1>
            <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed mb-8">
              Start for free, upgrade when you need more. No hidden fees, cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
              >
                Annual
                <span className="text-xs bg-success-100 dark:bg-success-700/20 text-success-700 dark:text-success-400 px-2 py-0.5 rounded-full font-semibold">-20%</span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid md:grid-cols-3 gap-5 mb-16">
            {PLANS.map((plan, i) => {
              const price = annual && plan.price > 0 ? Math.round(plan.price * (1 - discount)) : plan.price;
              const isCurrentPlan = profile?.subscription_tier === plan.name.toLowerCase();
              const isPopular = plan.badge === 'Most Popular';

              return (
                <div
                  key={plan.name}
                  className={`relative card p-7 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                    isPopular ? 'border-neutral-900 dark:border-white ring-2 ring-neutral-900 dark:ring-white' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                      isPopular ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-amber-400 text-white'
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-5">
                    <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${
                      isPopular ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'
                    }`}>
                      <plan.icon size={20} className={isPopular ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400'} />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-neutral-900 dark:text-white">€{price}</span>
                      {plan.price > 0 && <span className="text-sm text-neutral-400 mb-1.5">/{annual ? 'mo, billed annually' : 'month'}</span>}
                      {plan.price === 0 && <span className="text-sm text-neutral-400 mb-1.5">/{plan.period}</span>}
                    </div>
                    {annual && plan.price > 0 && (
                      <p className="text-xs text-success-600 dark:text-success-400 mt-1">Save €{Math.round(plan.price * discount * 12)}/year</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((feature, fi) => (
                      <li key={fi} className={`flex items-center gap-2.5 text-sm ${feature ? '' : 'opacity-30'}`}>
                        {feature ? (
                          <CheckCircle size={14} className={isPopular ? 'text-neutral-900 dark:text-white flex-shrink-0' : 'text-success-500 flex-shrink-0'} />
                        ) : (
                          <X size={14} className="text-neutral-300 dark:text-neutral-700 flex-shrink-0" />
                        )}
                        <span className={feature ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-300 dark:text-neutral-700'}>
                          {feature || 'Not available'}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <button disabled className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-neutral-200 dark:border-neutral-700 text-neutral-400 cursor-default">
                      Current Plan
                    </button>
                  ) : (
                    <Link
                      to={user ? '/settings/billing' : '/auth/register'}
                      className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                        plan.ctaVariant === 'primary'
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100'
                          : 'border-2 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {plan.cta} {plan.price > 0 && <ArrowRight size={14} />}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 mb-16 py-8 border-y border-neutral-100 dark:border-neutral-800">
            {['No credit card required', '14-day free trial', 'Cancel anytime', 'GDPR compliant'].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <CheckCircle size={15} className="text-success-500" />
                {item}
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white text-center mb-8">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <div key={i} className="card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-6 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{faq.q}</span>
                    <span className={`text-neutral-400 transition-transform duration-200 flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-45' : ''}`}>
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4 animate-fade-in">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
