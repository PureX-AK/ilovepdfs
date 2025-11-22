'use client';

import { useState } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTags,
  faCheck,
  faTimes,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = {
    free: {
      name: 'Free',
      monthlyPrice: '$0',
      yearlyPrice: '$0',
      description: 'Perfect for occasional use',
      features: [
        { text: '3 merges per day', included: true },
        { text: 'Files up to 10MB', included: true },
        { text: 'Basic PDF tools', included: true },
        { text: 'Standard processing speed', included: true },
        { text: 'Priority support', included: false },
        { text: 'Advanced features', included: false },
      ],
      buttonText: 'Get Started Free',
      buttonStyle: 'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-blue-50',
    },
    pro: {
      name: 'Pro',
      monthlyPrice: '$9',
      yearlyPrice: '$7',
      description: 'For regular PDF users',
      popular: true,
      features: [
        { text: 'Unlimited merges', included: true },
        { text: 'Files up to 100MB', included: true },
        { text: 'All PDF tools', included: true },
        { text: 'Fast processing', included: true },
        { text: 'Email support', included: true },
        { text: 'Password protection', included: true },
      ],
      buttonText: 'Start Pro Trial',
      buttonStyle: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: '$29',
      yearlyPrice: '$22',
      description: 'For teams and businesses',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Team collaboration', included: true },
        { text: 'API access', included: true },
        { text: 'Priority processing', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'Custom integrations', included: true },
      ],
      buttonText: 'Contact Sales',
      buttonStyle: 'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-blue-50',
    },
  };

  const faqs = [
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.',
    },
    {
      question: 'Is there a free trial for paid plans?',
      answer: 'Yes, we offer a 14-day free trial for both Pro and Enterprise plans. No credit card required.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal for convenient payment processing.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, contact our support team for a full refund.',
    },
  ];

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />
      
      {/* Breadcrumb */}
      <section className="bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
            <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
            <span className="text-[var(--color-text-dark)] font-medium">Pricing</span>
          </div>
        </div>
      </section>

      <main className="flex-grow">
        {/* Pricing Hero */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 text-center">
            <div className="bg-blue-100 text-[var(--color-primary)] rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FontAwesomeIcon icon={faTags} className="text-2xl" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-dark)] mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto mb-8">
              Choose the plan that fits your needs. Start for free or upgrade for unlimited access to all PDF tools.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className="text-[var(--color-text-muted)] font-medium">Monthly</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className={`relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                  isYearly ? 'bg-[var(--color-primary)]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                    isYearly ? 'translate-x-8' : ''
                  }`}
                />
              </button>
              <span className="text-[var(--color-text-dark)] font-medium">Yearly</span>
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">Save 25%</span>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {Object.entries(plans).map(([key, plan]) => (
                <div
                  key={key}
                  className={`bg-white rounded-2xl border p-8 relative ${
                    'popular' in plan && plan.popular
                      ? 'border-2 border-[var(--color-primary)] transform scale-105'
                      : 'border-[var(--color-border-gray)]'
                  }`}
                >
                  {'popular' in plan && plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-[var(--color-text-dark)] mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-[var(--color-text-dark)]">
                        {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-[var(--color-text-muted)]">/month</span>
                    </div>
                    <p className="text-[var(--color-text-muted)]">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-center ${!feature.included ? 'opacity-50' : ''}`}>
                        {feature.included ? (
                          <FontAwesomeIcon icon={faCheck} className="text-green-500 mr-3" />
                        ) : (
                          <FontAwesomeIcon icon={faTimes} className="text-gray-400 mr-3" />
                        )}
                        <span className={feature.included ? 'text-[var(--color-text-dark)]' : 'text-[var(--color-text-muted)]'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${plan.buttonStyle}`}>
                    {plan.buttonText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-[var(--color-text-muted)]">Everything you need to know about our pricing</p>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">{faq.question}</h3>
                  <p className="text-[var(--color-text-muted)]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="bg-[var(--color-primary)] rounded-2xl p-12 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-lg mb-8 opacity-90">
                Join thousands of users who trust PDFMaster for their document needs
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-[var(--color-primary)] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Start Free Trial
                </button>
                <Link
                  href="/contact"
                  className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

