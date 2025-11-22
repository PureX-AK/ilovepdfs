'use client';

import { useState, useEffect } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
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
      window.history.replaceState({}, '', '/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    const toastId = showLoading('Logging in...');

    const result = await login(email, password);
    
    if (result.success) {
      updateToSuccess(toastId, 'Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      updateToError(toastId, result.error || 'Login failed. Please try again.');
    }
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      const toastId = showLoading(`Redirecting to ${provider}...`);
      
      if (provider === 'Google') {
        window.location.href = '/api/auth/google?action=login';
      } else {
        updateToError(toastId, 'Unsupported provider');
      }
    } catch (error) {
      showError('Failed to initiate social login');
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
                <FontAwesomeIcon icon={faUser} className="text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-dark)] mb-2">Welcome Back</h1>
              <p className="text-[var(--color-text-muted)]">Log in to access your PDF tools</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faEnvelope} className="text-[var(--color-text-muted)]" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-dark)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faLock} className="text-[var(--color-text-muted)]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-[var(--color-border-gray)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border-gray)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-[var(--color-text-dark)]">
                    Remember me
                  </label>
                </div>
                <Link href="#" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? (
                  <>
                    <FontAwesomeIcon icon={faLock} className="mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border-gray)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[var(--color-text-muted)]">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="flex items-center justify-center px-6 py-3 border border-[var(--color-border-gray)] rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FontAwesomeIcon icon={faGoogle} className="text-red-500 mr-2" />
                <span className="text-sm font-medium text-[var(--color-text-dark)]">Continue with Google</span>
              </button>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                Don't have an account?{' '}
                <Link href="/signup" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-[var(--color-text-muted)]">
              <FontAwesomeIcon icon={faShieldHalved} className="text-green-600 mr-2" />
              <span>Your data is secure and encrypted</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

