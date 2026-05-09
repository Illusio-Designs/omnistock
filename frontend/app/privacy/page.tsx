import { PublicLayout } from '@/components/layout/PublicLayout';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Kartriq',
  description: 'How Kartriq collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: April 2026</p>

          <div className="mt-10 prose prose-slate prose-sm max-w-none space-y-8">
            <Section title="1. Introduction">
              Kartriq (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the kartriq.vercel.app website and the Kartriq SaaS platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </Section>

            <Section title="2. Information We Collect">
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li><strong>Account Information:</strong> Name, email address, phone number, company name, and GST number when you register.</li>
                <li><strong>Business Data:</strong> Products, inventory, orders, vendor details, and channel credentials you store on our platform.</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Razorpay. We do not store your card numbers.</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, browser type, IP address, and device information collected automatically.</li>
                <li><strong>Cookies:</strong> Session cookies for authentication and analytics cookies for improving our service.</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>Provide, operate, and maintain the Kartriq platform.</li>
                <li>Process transactions and send billing-related communications.</li>
                <li>Respond to support requests and communicate service updates.</li>
                <li>Monitor usage patterns to improve features and performance.</li>
                <li>Prevent fraud and enforce our Terms of Service.</li>
              </ul>
            </Section>

            <Section title="4. Data Security">
              We implement industry-standard security measures including:
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>AES-256-GCM encryption for channel credentials at rest.</li>
                <li>JWT-based authentication with HTTPS for all API communications.</li>
                <li>Role-based access control (RBAC) to limit data exposure.</li>
                <li>Regular security audits and automated vulnerability scanning.</li>
              </ul>
            </Section>

            <Section title="5. Data Sharing">
              We do not sell, trade, or rent your personal data. We may share data with:
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li><strong>Service Providers:</strong> Payment processors (Razorpay), email services, and hosting providers who assist in operating our platform.</li>
                <li><strong>Channel Integrations:</strong> Marketplace and logistics APIs you explicitly connect (e.g., Amazon, Flipkart, Shiprocket).</li>
                <li><strong>Legal Compliance:</strong> When required by law, regulation, or legal process.</li>
              </ul>
            </Section>

            <Section title="6. Data Retention">
              We retain your data for as long as your account is active or as needed to provide our services. Upon account deletion, your data is permanently removed within 30 days, except where retention is required by law.
            </Section>

            <Section title="7. Your Rights">
              You have the right to:
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>Access, update, or delete your personal data from your account settings.</li>
                <li>Export all your data via CSV or the REST API.</li>
                <li>Opt out of non-essential communications.</li>
                <li>Request a copy of all data we hold about you.</li>
              </ul>
            </Section>

            <Section title="8. Third-Party Links">
              Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.
            </Section>

            <Section title="9. Changes to This Policy">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of the Service after changes constitutes acceptance.
            </Section>

            <Section title="10. Contact Us">
              If you have questions about this Privacy Policy, contact us at:
              <div className="mt-3 space-y-1">
                <p>Email: <a href="mailto:info@kartriq.com" className="text-emerald-600 hover:underline">info@kartriq.com</a></p>
                <p>Phone: <a href="tel:+918490009684" className="text-emerald-600 hover:underline">+91 84900 09684</a></p>
                <p>Address: Bangalore, Karnataka, India</p>
              </div>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <Link href="/terms" className="text-sm text-emerald-600 hover:underline font-medium">
              Read our Terms of Service &rarr;
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <div className="text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}
