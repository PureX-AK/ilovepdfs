import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--color-border-gray)] mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-sm text-[var(--color-text-muted)]">
              &copy; 2025 PDFMaster. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <Link href="/contact" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

