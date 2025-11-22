'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faUser,
  faChartLine,
  faCogs,
  faEnvelope,
  faLock,
  faEye,
  faEdit,
  faTrash,
  faFileContract,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />

      {/* Page Header */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">Privacy Policy & Terms of Service</h1>
            <p className="text-lg text-[var(--color-text-muted)]">Last updated: January 15, 2025</p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="py-6 bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-8 border-b border-[var(--color-border-gray)]">
              <button
                onClick={() => setActiveTab('privacy')}
                className={`pb-3 px-1 border-b-2 font-medium focus:outline-none transition-colors ${
                  activeTab === 'privacy'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]'
                }`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setActiveTab('terms')}
                className={`pb-3 px-1 border-b-2 font-medium focus:outline-none transition-colors ${
                  activeTab === 'terms'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]'
                }`}
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      {activeTab === 'privacy' && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              {/* Overview */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[var(--color-text-dark)] mb-4">Privacy Policy Overview</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600 text-xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">Your Privacy Matters</h3>
                      <p className="text-blue-800">We are committed to protecting your personal information and being transparent about how we collect, use, and share your data.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Collection */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">1. Information We Collect</h3>
                <div className="space-y-4">
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-3 flex items-center">
                      <FontAwesomeIcon icon={faUser} className="text-[var(--color-primary)] mr-2" />
                      Personal Information
                    </h4>
                    <p className="text-[var(--color-text-muted)] mb-3">We may collect the following personal information:</p>
                    <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-1">
                      <li>Email address when you create an account</li>
                      <li>Name and contact information you provide</li>
                      <li>Payment information for premium services</li>
                      <li>Profile information and preferences</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-3 flex items-center">
                      <FontAwesomeIcon icon={faChartLine} className="text-[var(--color-primary)] mr-2" />
                      Usage Information
                    </h4>
                    <p className="text-[var(--color-text-muted)] mb-3">We automatically collect certain information about your use of our service:</p>
                    <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-1">
                      <li>Device information and browser type</li>
                      <li>IP address and location data</li>
                      <li>Pages visited and features used</li>
                      <li>File processing activities and preferences</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How We Use Information */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">2. How We Use Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <div className="flex items-center mb-3">
                      <div className="bg-green-100 rounded-full p-2 mr-3">
                        <FontAwesomeIcon icon={faCogs} className="text-green-600" />
                      </div>
                      <h4 className="font-medium text-[var(--color-text-dark)]">Service Provision</h4>
                    </div>
                    <ul className="text-[var(--color-text-muted)] text-sm space-y-1">
                      <li>• Process and convert your files</li>
                      <li>• Provide customer support</li>
                      <li>• Maintain and improve our service</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <div className="flex items-center mb-3">
                      <div className="bg-blue-100 rounded-full p-2 mr-3">
                        <FontAwesomeIcon icon={faEnvelope} className="text-blue-600" />
                      </div>
                      <h4 className="font-medium text-[var(--color-text-dark)]">Communication</h4>
                    </div>
                    <ul className="text-[var(--color-text-muted)] text-sm space-y-1">
                      <li>• Send service updates</li>
                      <li>• Respond to inquiries</li>
                      <li>• Marketing communications (opt-in)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">3. Data Protection & Security</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faLock} className="text-green-600 text-xl mt-1" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-3">Security Measures</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheck} className="text-green-600 mr-2" />
                          <span className="text-sm">End-to-end encryption</span>
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheck} className="text-green-600 mr-2" />
                          <span className="text-sm">Secure file processing</span>
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheck} className="text-green-600 mr-2" />
                          <span className="text-sm">Automatic file deletion</span>
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faCheck} className="text-green-600 mr-2" />
                          <span className="text-sm">Regular security audits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Rights */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">4. Your Rights & Control</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6 text-center">
                    <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <FontAwesomeIcon icon={faEye} className="text-purple-600" />
                    </div>
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-2">Access</h4>
                    <p className="text-[var(--color-text-muted)] text-sm">View what personal data we have about you</p>
                  </div>
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6 text-center">
                    <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <FontAwesomeIcon icon={faEdit} className="text-orange-600" />
                    </div>
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-2">Correct</h4>
                    <p className="text-[var(--color-text-muted)] text-sm">Update or correct your personal information</p>
                  </div>
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6 text-center">
                    <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <FontAwesomeIcon icon={faTrash} className="text-red-600" />
                    </div>
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-2">Delete</h4>
                    <p className="text-[var(--color-text-muted)] text-sm">Request deletion of your personal data</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">5. Contact Us</h3>
                <div className="bg-gray-50 border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] mb-4">If you have any questions about this Privacy Policy or your personal data, please contact us:</p>
                  <div className="flex flex-col md:flex-row md:space-x-8 space-y-2 md:space-y-0">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEnvelope} className="text-[var(--color-primary)] mr-2" />
                      <span className="text-[var(--color-text-dark)]">privacy@pdfmaster.com</span>
                    </div>
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faEnvelope} className="text-[var(--color-primary)] mr-2" />
                      <Link href="/contact" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                        Contact Support
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Terms of Service Content */}
      {activeTab === 'terms' && (
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-[var(--color-text-dark)] mb-4">Terms of Service</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faFileContract} className="text-yellow-600 text-xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">Agreement to Terms</h3>
                      <p className="text-yellow-800">By using PDFMaster, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">1. Acceptance of Terms</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    By accessing and using PDFMaster services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">2. Service Description</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] mb-4">PDFMaster provides online PDF processing tools including but not limited to:</p>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 ml-4">
                    <li>PDF merging and splitting</li>
                    <li>PDF compression and optimization</li>
                    <li>Document format conversion</li>
                    <li>PDF editing and annotation</li>
                    <li>Document security and encryption features</li>
                  </ul>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">3. User Obligations</h3>
                <div className="space-y-4">
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-3">Account Security</h4>
                    <p className="text-[var(--color-text-muted)]">You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
                  </div>
                  <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-dark)] mb-3">Acceptable Use</h4>
                    <p className="text-[var(--color-text-muted)]">You agree not to use our service for any unlawful purposes or to upload content that violates copyright, contains malware, or is otherwise harmful.</p>
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">4. Limitations of Liability</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    PDFMaster shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services. We provide the service "as is" without warranties of any kind.
                  </p>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">5. Data Processing</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    Files uploaded to our service are processed temporarily and automatically deleted after processing. We do not store your documents permanently unless explicitly stated for premium features.
                  </p>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">6. Modifications</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the service constitutes acceptance of modified terms.
                  </p>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-4">7. Termination</h3>
                <div className="bg-white border border-[var(--color-border-gray)] rounded-lg p-6">
                  <p className="text-[var(--color-text-muted)] leading-relaxed">
                    We may terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

