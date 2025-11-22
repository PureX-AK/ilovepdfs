'use client';

import { useState } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faPaperPlane,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import {
  faTwitter,
  faLinkedin,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../lib/utils';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
    priority: 'low',
    newsletter: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How secure are my PDF files?',
      answer: 'All PDF processing happens locally in your browser. Your files are never uploaded to our servers, ensuring complete privacy and security.',
    },
    {
      question: 'What file size limits do you have?',
      answer: 'Each PDF file can be up to 25MB. You can merge multiple files as long as each individual file stays within this limit.',
    },
    {
      question: 'Do you offer API access?',
      answer: 'Yes! We offer API access for businesses. Contact our sales team for more information about enterprise solutions.',
    },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
      showError('Please fill in all required fields');
      return;
    }

    if (formData.message.length < 10) {
      showError('Message must be at least 10 characters long');
      return;
    }

    const toastId = showLoading('Sending message...');
    setIsLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        updateToError(toastId, data.error || 'Failed to send message. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      updateToSuccess(toastId, data.message || 'Message sent successfully! We\'ll get back to you within 24 hours.');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: '',
        priority: 'low',
        newsletter: false,
      });
    } catch (error) {
      setIsLoading(false);
      updateToError(toastId, 'An error occurred. Please try again later.');
    }
  };

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <section className="bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
            <FontAwesomeIcon icon={faEnvelope} className="mx-2 text-xs" />
            <span className="text-[var(--color-text-dark)] font-medium">Contact</span>
          </div>
        </div>
      </section>

      <main className="flex-grow">
        {/* Contact Header */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 text-center">
            <div className="bg-blue-100 text-[var(--color-primary)] rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FontAwesomeIcon icon={faEnvelope} className="text-2xl" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-dark)] mb-4">Get in Touch</h1>
            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
              Have questions about our PDF tools? Need help with a specific feature? We're here to help you get the most out of PDFMaster.
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Contact Information */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border-gray)] p-8">
                    <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-6">Contact Information</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-100 text-[var(--color-primary)] rounded-lg p-3 flex-shrink-0">
                          <FontAwesomeIcon icon={faEnvelope} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--color-text-dark)] mb-1">Email</h4>
                          <p className="text-[var(--color-text-muted)]">support@pdfmaster.com</p>
                          <p className="text-sm text-[var(--color-text-muted)]">We typically respond within 24 hours</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className="bg-green-100 text-green-600 rounded-lg p-3 flex-shrink-0">
                          <FontAwesomeIcon icon={faPhone} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--color-text-dark)] mb-1">Phone</h4>
                          <p className="text-[var(--color-text-muted)]">+1 (555) 123-4567</p>
                          <p className="text-sm text-[var(--color-text-muted)]">Mon-Fri, 9 AM - 6 PM EST</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className="bg-purple-100 text-purple-600 rounded-lg p-3 flex-shrink-0">
                          <FontAwesomeIcon icon={faMapMarkerAlt} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[var(--color-text-dark)] mb-1">Office</h4>
                          <p className="text-[var(--color-text-muted)]">
                            123 Tech Street<br />San Francisco, CA 94105
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-[var(--color-border-gray)]">
                      <h4 className="font-semibold text-[var(--color-text-dark)] mb-4">Follow Us</h4>
                      <div className="flex space-x-4">
                        <a href="#" className="bg-blue-100 text-blue-600 rounded-lg p-3 hover:bg-blue-200 transition-colors">
                          <FontAwesomeIcon icon={faTwitter} />
                        </a>
                        <a href="#" className="bg-blue-100 text-blue-800 rounded-lg p-3 hover:bg-blue-200 transition-colors">
                          <FontAwesomeIcon icon={faLinkedin} />
                        </a>
                        <a href="#" className="bg-gray-100 text-gray-800 rounded-lg p-3 hover:bg-gray-200 transition-colors">
                          <FontAwesomeIcon icon={faGithub} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border-gray)] p-8">
                    <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-6">Send us a Message</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="first-name" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            id="first-name"
                            name="firstName"
                            required
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          />
                        </div>
                        <div>
                          <label htmlFor="last-name" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            id="last-name"
                            name="lastName"
                            required
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>

                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                          Subject *
                        </label>
                        <select
                          id="subject"
                          name="subject"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        >
                          <option value="">Select a subject</option>
                          <option value="general">General Inquiry</option>
                          <option value="support">Technical Support</option>
                          <option value="billing">Billing Question</option>
                          <option value="feature">Feature Request</option>
                          <option value="bug">Bug Report</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          required
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Please describe your inquiry in detail..."
                          className="w-full px-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">Priority Level</label>
                        <div className="flex space-x-4">
                          {['low', 'medium', 'high'].map((priority) => (
                            <label key={priority} className="flex items-center">
                              <input
                                type="radio"
                                name="priority"
                                value={priority}
                                checked={formData.priority === priority}
                                onChange={handleChange}
                                className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                              />
                              <span className="ml-2 text-sm text-[var(--color-text-dark)] capitalize">{priority}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="newsletter"
                          name="newsletter"
                          checked={formData.newsletter}
                          onChange={handleChange}
                          className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <label htmlFor="newsletter" className="ml-2 text-sm text-[var(--color-text-muted)]">
                          Subscribe to our newsletter for updates and tips
                        </label>
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-[var(--color-primary)] text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                          {isLoading ? 'Sending...' : 'Send Message'}
                        </button>
                        <p className="text-sm text-[var(--color-text-muted)] mt-3 text-center">
                          We'll get back to you within 24 hours
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-4">Frequently Asked Questions</h2>
                <p className="text-[var(--color-text-muted)]">Quick answers to common questions</p>
              </div>

              <div className="space-y-6">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white border border-[var(--color-border-gray)] rounded-lg">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                    >
                      <span className="font-semibold text-[var(--color-text-dark)]">{faq.question}</span>
                      <FontAwesomeIcon
                        icon={openFaq === idx ? faChevronUp : faChevronDown}
                        className="text-[var(--color-text-muted)]"
                      />
                    </button>
                    {openFaq === idx && (
                      <div className="px-6 pb-4 text-[var(--color-text-muted)]">{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

