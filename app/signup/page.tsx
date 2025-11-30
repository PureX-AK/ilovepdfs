'use client';

import { useState, useEffect } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUser,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import {
  faGoogle,
} from '@fortawesome/free-brands-svg-icons';
import { showError, showSuccess, showLoading, updateToSuccess, updateToError } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/');
    }
    
    // Check for OAuth errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      showError(`OAuth error: ${decodeURIComponent(error)}`);
      // Clean up URL
      window.history.replaceState({}, '', '/signup');
    }
  }, [isAuthenticated, authLoading, router]);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullname.trim()) {
      showError('Please enter your full name');
      return;
    }

    if (!formData.email.trim()) {
      showError('Please enter your email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match!');
      return;
    }

    if (!terms) {
      showError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    if (formData.password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }

    const toastId = showLoading('Creating account...');

    const result = await register(formData.email, formData.password, formData.fullname);
    
    if (result.success) {
      updateToSuccess(toastId, 'Account created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      updateToError(toastId, result.error || 'Registration failed. Please try again.');
    }
  };

  const handleSocialSignup = async (provider: string) => {
    try {
      const toastId = showLoading(`Redirecting to ${provider}...`);
      
      if (provider === 'Google') {
        window.location.href = '/api/auth/google?action=signup';
      } else {
        updateToError(toastId, 'Unsupported provider');
      }
    } catch (error) {
      showError('Failed to initiate social signup');
    }
  };

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-[var(--color-border-gray)] p-8">
            <div className="text-center mb-8">
              <div className="bg-blue-100 text-[var(--color-primary)] rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserPlus} className="text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-dark)] mb-2">Create Your Account</h1>
              <p className="text-[var(--color-text-muted)]">Join pagalPDF to access all our premium tools</p>
            </div>

            {/* Social Signup */}
            <div className="mb-6">
              <button
                onClick={() => handleSocialSignup('Google')}
                className="w-full flex items-center justify-center space-x-3 bg-white border border-[var(--color-border-gray)] rounded-lg py-3 px-4 font-medium text-[var(--color-text-dark)] hover:bg-gray-50 transition-colors"
              >
                <FontAwesomeIcon icon={faGoogle} className="text-red-500" />
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <div className="flex-1 border-t border-[var(--color-border-gray)]"></div>
              <span className="px-4 text-sm text-[var(--color-text-muted)]">or</span>
              <div className="flex-1 border-t border-[var(--color-border-gray)]"></div>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullname" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    required
                    value={formData.fullname}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="Enter your full name"
                  />
                  <FontAwesomeIcon
                    icon={faUser}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="Enter your email"
                  />
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="Create a strong password"
                  />
                  <FontAwesomeIcon
                    icon={faLock}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-1 w-1/4 rounded ${
                          idx < Math.min(passwordStrength, 4)
                            ? passwordStrength <= 2
                              ? 'bg-red-400'
                              : passwordStrength <= 3
                              ? 'bg-yellow-400'
                              : 'bg-green-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Use 8+ characters with a mix of letters, numbers & symbols
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-[var(--color-border-gray)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <FontAwesomeIcon
                    icon={faLock}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)]"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[var(--color-primary)] border-[var(--color-border-gray)] rounded focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="terms" className="text-sm text-[var(--color-text-muted)]">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="marketing"
                  name="marketing"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[var(--color-primary)] border-[var(--color-border-gray)] rounded focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="marketing" className="text-sm text-[var(--color-text-muted)]">
                  Send me product updates and special offers (optional)
                </label>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[var(--color-primary)] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-[var(--color-text-muted)]">
              <FontAwesomeIcon icon={faShieldHalved} className="text-green-600" />
              <span>Your data is encrypted and secure</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

