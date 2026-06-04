import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TermsPage() {
  useDocumentTitle('Terms of Service');

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-10">Last updated: June 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using Spotr ("the Platform"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the Platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">2. Description of Service</h2>
              <p>Spotr is an online marketplace that connects clients (individuals and businesses) with freelancers offering a range of professional services. We provide the platform for these connections but are not a party to any agreements made between clients and freelancers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">3. User Accounts</h2>
              <p>You must create an account to use most features of the Platform. You are responsible for maintaining the security of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">4. Acceptable Use</h2>
              <p>You agree not to use the Platform to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to any portion of the Platform</li>
                <li>Circumvent our payment systems or fee structure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">5. Fees and Payments</h2>
              <p>Spotr charges service fees on transactions made through the Platform. Fee structures are outlined on our Pricing page. We reserve the right to modify fees with reasonable notice to users.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">6. Intellectual Property</h2>
              <p>Users retain ownership of content they post on the Platform. By posting content, you grant Spotr a non-exclusive, worldwide license to display and promote that content within the Platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">7. Limitation of Liability</h2>
              <p>Spotr is not liable for any disputes between clients and freelancers, nor for the quality of services delivered. Our liability is limited to the amount of fees paid to us in the three months prior to any claim.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">8. Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time through your Settings page.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">9. Contact</h2>
              <p>For questions about these terms, contact us at <a href="mailto:legal@spotr.app" className="text-neutral-900 dark:text-white underline">legal@spotr.app</a>.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex gap-6 text-sm">
            <Link to="/privacy" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Back to Home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
