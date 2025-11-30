'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { showSuccess } from '../lib/utils';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-[60] overflow-hidden h-[70px]">
      <nav className="container mx-auto px-6 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-[50px] h-[50px] flex-shrink-0 flex items-center justify-center">
              <Image src="/logo.png" alt="pagalPDF Logo" width={50} height={50} className="object-contain w-full h-full" unoptimized priority />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900 whitespace-nowrap">
              pagal<span className="text-[var(--color-primary)]">pdf</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              All Tools
            </Link>
            <Link href="/merge" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Merge PDF
            </Link>
            <Link href="/split" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Split PDF
            </Link>
            <Link href="/organize-pdf" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Organize PDF
            </Link>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center space-x-2 text-[var(--color-text-muted)]">
                  <FontAwesomeIcon icon={faUser} />
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium transition-colors flex items-center space-x-2"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium transition-colors">
                  Log In
                </Link>
                <Link href="/signup" className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Toggle menu"
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="text-2xl" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed top-[70px] left-0 right-0 bottom-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <div className="fixed top-[70px] left-0 right-0 bottom-0 bg-white z-50 md:hidden overflow-y-auto">
              <div className="flex flex-col px-6 py-6 space-y-4">
                {/* Navigation Links */}
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-2 border-b border-[var(--color-border-gray)]"
                >
                  All Tools
                </Link>
                <Link
                  href="/merge"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-2 border-b border-[var(--color-border-gray)]"
                >
                  Merge PDF
                </Link>
                <Link
                  href="/split"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-2 border-b border-[var(--color-border-gray)]"
                >
                  Split PDF
                </Link>
                <Link
                  href="/organize-pdf"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-2 border-b border-[var(--color-border-gray)]"
                >
                  Organize PDF
                </Link>

                {/* Auth Section */}
                <div className="pt-4 border-t-2 border-[var(--color-border-gray)] mt-4">
                  {isAuthenticated && user ? (
                    <>
                      <div className="flex items-center space-x-2 text-[var(--color-text-dark)] py-3 mb-4">
                        <FontAwesomeIcon icon={faUser} className="text-[var(--color-primary)]" />
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-2 flex items-center space-x-2"
                      >
                        <FontAwesomeIcon icon={faSignOutAlt} />
                        <span>Log Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-lg font-medium text-[var(--color-text-dark)] hover:text-[var(--color-primary)] transition-colors py-3 mb-3"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full bg-[var(--color-primary)] text-white text-center py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}

