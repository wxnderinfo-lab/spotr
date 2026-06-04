import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  useDocumentTitle('Privacy Policy');

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-10">Last updated: June 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">1. Information We Collect</h2>
              <p>We collect information you provide directly, such as your name, email address, profile information, and payment details. We also collect usage data including pages visited, searches performed, and interactions with other users.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Provide and improve our services</li>
                <li>Match clients with relevant freelancers</li>
                <li>Send notifications about activity relevant to you</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">3. Information Sharing</h2>
              <p>We do not sell your personal data. We share information with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Other users, as necessary for the platform to function (e.g., your profile is visible to potential clients)</li>
                <li>Service providers who help us operate the platform (e.g., payment processors, cloud hosting)</li>
                <li>Law enforcement when required by applicable law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">4. Cookies and Tracking</h2>
              <p>We use cookies and similar technologies to maintain sessions, remember preferences, and analyze platform usage. We use Google Analytics to understand how users interact with the platform. You can opt out via your browser settings.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">5. Data Retention</h2>
              <p>We retain your account data for as long as your account is active. After deletion, we may retain certain data for up to 90 days to comply with legal obligations and resolve disputes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">6. Your Rights (GDPR)</h2>
              <p>If you are in the European Union, you have the right to access, correct, delete, or export your personal data. You can exercise these rights through your Settings page or by contacting us directly.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">7. Security</h2>
              <p>We use industry-standard security measures including encryption in transit (TLS), encrypted data storage, and access controls. No system is 100% secure; we encourage you to use a strong, unique password.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">8. Contact</h2>
              <p>For privacy concerns or data requests, contact our Data Protection Officer at <a href="mailto:privacy@spotr.app" className="text-neutral-900 dark:text-white underline">privacy@spotr.app</a>.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex gap-6 text-sm">
            <Link to="/terms" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">Back to Home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
