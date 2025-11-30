import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faRocket,
  faPlayCircle,
  faBolt,
  faShieldHalved,
  faHandPointer,
  faLayerGroup,
  faArrowsUpDown,
  faEye,
  faFileCircleCheck,
  faCloud,
  faCompress,
  faTextWidth,
  faGaugeHigh,
  faCircleCheck,
  faFilePdf,
  faHeart,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Features - pagalPDF",
  description: "Discover all the powerful features of pagalPDF - lightning-fast processing, military-grade security, and professional-quality results.",
};

export default function FeaturesPage() {
  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-white py-20 h-[500px] flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-block bg-blue-100 text-[var(--color-primary)] text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <FontAwesomeIcon icon={faStar} className="mr-2" />
                Powerful PDF Tools
              </div>
              <h1 className="text-5xl font-bold text-[var(--color-text-dark)] mb-6">
                Everything You Need for PDF Management
              </h1>
              <p className="text-xl text-[var(--color-text-muted)] mb-8 max-w-2xl mx-auto">
                Experience lightning-fast processing, military-grade security, and professional-quality results with our comprehensive PDF merger tool
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Link
                  href="/"
                  className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg"
                >
                  <FontAwesomeIcon icon={faRocket} className="mr-2" />
                  Get Started Free
                </Link>
                <button className="bg-white text-[var(--color-primary)] px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-[var(--color-primary)]">
                  <FontAwesomeIcon icon={faPlayCircle} className="mr-2" />
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Overview */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">
                Core Features That Set Us Apart
              </h2>
              <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
                Our PDF merger combines speed, security, and quality to deliver an unmatched experience
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Speed Card */}
              <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-[var(--color-border-gray)] hover:shadow-xl transition-all duration-300">
                <div className="bg-blue-600 text-white rounded-2xl p-5 w-20 h-20 flex items-center justify-center mb-6">
                  <FontAwesomeIcon icon={faBolt} className="text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-4">Lightning-Fast Speed</h3>
                <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
                  Process and merge multiple PDF files in seconds, not minutes. Our optimized engine handles large documents with ease.
                </p>
                <ul className="space-y-3">
                  {[
                    'Merge up to 50 files simultaneously',
                    'Average processing time: 2-3 seconds',
                    'No file size limitations',
                    'Instant preview before merging',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                      <span className="text-sm text-[var(--color-text-dark)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Card */}
              <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-[var(--color-border-gray)] hover:shadow-xl transition-all duration-300">
                <div className="bg-green-600 text-white rounded-2xl p-5 w-20 h-20 flex items-center justify-center mb-6">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-4">Military-Grade Security</h3>
                <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
                  Your documents are 100% safe with client-side processing and zero data retention policies.
                </p>
                <ul className="space-y-3">
                  {[
                    'All processing happens locally',
                    'Files never uploaded to servers',
                    '256-bit SSL encryption',
                    'GDPR & CCPA compliant',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                      <span className="text-sm text-[var(--color-text-dark)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quality Card */}
              <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-[var(--color-border-gray)] hover:shadow-xl transition-all duration-300">
                <div className="bg-purple-600 text-white rounded-2xl p-5 w-20 h-20 flex items-center justify-center mb-6">
                  <FontAwesomeIcon icon={faStar} className="text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-4">Professional Quality</h3>
                <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
                  Maintain original document quality with advanced compression algorithms and format preservation.
                </p>
                <ul className="space-y-3">
                  {[
                    'Zero quality loss during merge',
                    'Preserves fonts and formatting',
                    'Maintains hyperlinks & bookmarks',
                    'Smart compression options',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                      <span className="text-sm text-[var(--color-text-dark)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features Grid */}
        <section className="py-20 bg-[var(--color-secondary)]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">Complete Feature Set</h2>
              <p className="text-lg text-[var(--color-text-muted)]">Explore all the powerful capabilities at your fingertips</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {[
                { icon: faHandPointer, title: 'Drag & Drop', desc: 'Intuitive interface for easy file upload and reordering', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
                { icon: faLayerGroup, title: 'Batch Processing', desc: 'Merge multiple PDF sets in one go', bgClass: 'bg-green-100', textClass: 'text-green-600' },
                { icon: faArrowsUpDown, title: 'Custom Order', desc: 'Arrange pages exactly how you want them', bgClass: 'bg-yellow-100', textClass: 'text-yellow-600' },
                { icon: faEye, title: 'Live Preview', desc: 'See results before finalizing the merge', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
                { icon: faFileCircleCheck, title: 'Page Selection', desc: 'Choose specific pages from each document', bgClass: 'bg-red-100', textClass: 'text-red-600' },
                { icon: faCloud, title: 'Cloud Storage', desc: 'Import from Google Drive, Dropbox', bgClass: 'bg-indigo-100', textClass: 'text-indigo-600' },
                { icon: faCompress, title: 'Smart Compression', desc: 'Reduce file size without quality loss', bgClass: 'bg-teal-100', textClass: 'text-teal-600' },
                { icon: faTextWidth, title: 'OCR Support', desc: 'Extract text from scanned documents', bgClass: 'bg-orange-100', textClass: 'text-orange-600' },
              ].map((feature, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl hover:shadow-lg transition-all duration-300">
                  <div className={`${feature.bgClass} ${feature.textClass} rounded-lg p-3 w-14 h-14 flex items-center justify-center mb-4`}>
                    <FontAwesomeIcon icon={feature.icon} className="text-lg" />
                  </div>
                  <h4 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">{feature.title}</h4>
                  <p className="text-sm text-[var(--color-text-muted)]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">Performance You Can Trust</h2>
              <p className="text-lg text-[var(--color-text-muted)]">Real metrics from millions of processed documents</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {[
                { icon: faGaugeHigh, value: '2.3s', label: 'Average Processing Time', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
                { icon: faCircleCheck, value: '99.9%', label: 'Uptime Guarantee', bgClass: 'bg-green-100', textClass: 'text-green-600' },
                { icon: faFilePdf, value: '50M+', label: 'Documents Processed', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
                { icon: faHeart, value: '4.9/5', label: 'User Satisfaction', bgClass: 'bg-yellow-100', textClass: 'text-yellow-600' },
              ].map((metric, idx) => (
                <div key={idx} className="text-center">
                  <div className={`${metric.bgClass} ${metric.textClass} rounded-2xl p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center`}>
                    <FontAwesomeIcon icon={metric.icon} className="text-3xl" />
                  </div>
                  <div className="text-4xl font-bold text-[var(--color-text-dark)] mb-2">{metric.value}</div>
                  <p className="text-[var(--color-text-muted)] font-medium">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">How We Compare</h2>
              <p className="text-lg text-[var(--color-text-muted)]">See why thousands choose pagalPDF over alternatives</p>
            </div>
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--color-text-dark)]">Feature</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-[var(--color-primary)]">pagalPDF</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-[var(--color-text-muted)]">Competitor A</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-[var(--color-text-muted)]">Competitor B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-gray)]">
                    {[
                      { feature: 'Processing Speed', pagalpdf: true, compA: 'partial', compB: false },
                      { feature: 'Client-Side Processing', pagalpdf: true, compA: false, compB: false },
                      { feature: 'Quality Preservation', pagalpdf: true, compA: true, compB: 'partial' },
                      { feature: 'Batch Processing', pagalpdf: true, compA: 'partial', compB: true },
                      { feature: 'No File Size Limit', pagalpdf: true, compA: false, compB: 'partial' },
                    ].map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4 text-sm text-[var(--color-text-dark)]">{row.feature}</td>
                        <td className="px-6 py-4 text-center">
                          <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 text-xl" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.compA === true ? (
                            <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 text-xl" />
                          ) : row.compA === 'partial' ? (
                            <span className="text-yellow-500 text-xl">−</span>
                          ) : (
                            <span className="text-red-500 text-xl">×</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.compB === true ? (
                            <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 text-xl" />
                          ) : row.compB === 'partial' ? (
                            <span className="text-yellow-500 text-xl">−</span>
                          ) : (
                            <span className="text-red-500 text-xl">×</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[var(--color-primary)]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-white mb-6">Ready to Experience the Difference?</h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of satisfied users who trust pagalPDF for their document needs
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Link
                  href="/"
                  className="bg-white text-[var(--color-primary)] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <FontAwesomeIcon icon={faRocket} className="mr-2" />
                  Start Merging Now
                </Link>
                <Link
                  href="/contact"
                  className="bg-transparent text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:bg-opacity-10 transition-colors border-2 border-white"
                >
                  <FontAwesomeIcon icon={faPhone} className="mr-2" />
                  Contact Sales
                </Link>
              </div>
              <p className="text-blue-100 text-sm mt-6">No credit card required • Free forever plan available</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

