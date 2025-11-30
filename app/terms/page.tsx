'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faShieldHalved,
  faEnvelope,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />

      {/* Page Header */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">Legal Information</h1>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
            Our commitment to transparency and user rights
          </p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-8 bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6">
          <div className="flex justify-center space-x-8">
            <button
              onClick={() => setActiveTab('terms')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'terms'
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'privacy'
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </section>

      {/* Terms of Service Content */}
      {activeTab === 'terms' && (
        <section className="py-12">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-6">Terms of Service</h2>
              <p className="text-[var(--color-text-muted)] mb-6">Last updated: January 2025</p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">1. Acceptance of Terms</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    By accessing and using pagalPDF services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">2. Service Description</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                    pagalPDF provides online PDF processing tools including but not limited to:
                  </p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>PDF merging and splitting</li>
                    <li>PDF compression and optimization</li>
                    <li>Document format conversion</li>
                    <li>PDF editing and annotation</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">3. User Obligations</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">You agree to:</p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>Use the service only for lawful purposes</li>
                    <li>Not upload malicious files or content</li>
                    <li>Respect intellectual property rights</li>
                    <li>Not attempt to reverse engineer our services</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">4. Limitations of Liability</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    pagalPDF shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services. We provide the service "as is" without warranties of any kind.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">5. Data Processing</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    Files uploaded to our service are processed temporarily and automatically deleted after processing. We do not store your documents permanently unless explicitly stated for premium features.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">6. Modifications</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the service constitutes acceptance of modified terms.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">7. Termination</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We may terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Privacy Policy Content */}
      {activeTab === 'privacy' && (
        <section className="py-12">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-6">Privacy Policy</h2>
              <p className="text-[var(--color-text-muted)] mb-6">Last updated: January 2025</p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">1. Information We Collect</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                    We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
                  </p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>Account information (email, username)</li>
                    <li>Usage data and analytics</li>
                    <li>Device and browser information</li>
                    <li>Files uploaded for processing (temporarily)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">2. How We Use Information</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">We use the information we collect to:</p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process your document conversion requests</li>
                    <li>Send technical notices and support messages</li>
                    <li>Analyze usage patterns to enhance user experience</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">3. Information Sharing</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information in response to legal requests or to protect our rights and safety.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">4. Data Security</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We implement appropriate security measures to protect your information. All file uploads are encrypted in transit and processed on secure servers. Files are automatically deleted after processing.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">5. Cookies and Tracking</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser preferences.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">6. Your Rights</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Opt-out of marketing communications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">7. Contact Us</h3>
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    If you have questions about this Privacy Policy, please contact us at privacy@pagalpdf.com or through our{' '}
                    <Link href="/contact" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                      support page
                    </Link>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-4">Questions About Our Policies?</h2>
            <p className="text-[var(--color-text-muted)] mb-8">
              We're here to help clarify any questions you may have about our terms or privacy practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center justify-center">
                <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                Contact Support
              </Link>
              <Link href="/" className="border border-[var(--color-primary)] text-[var(--color-primary)] px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors inline-flex items-center justify-center">
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

