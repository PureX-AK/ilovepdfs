'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faSpinner,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { TestResult } from '../lib/test-utils';
import { showError, showSuccess } from '../lib/utils';

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    errors: number;
  } | null>(null);

  const runTests = async (tool?: string) => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const url = tool ? `/api/test-pdf?tool=${tool}` : '/api/test-pdf';
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setSummary(data.summary);
        
        if (data.summary.failed === 0 && data.summary.errors === 0) {
          showSuccess('All tests passed!');
        } else {
          showError(`${data.summary.failed + data.summary.errors} test(s) failed`);
        }
      } else {
        showError(data.error || 'Tests failed');
      }
    } catch (error: any) {
      showError(`Test error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'fail':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
      case 'error':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-[var(--color-secondary)] text-[var(--color-text-dark)] min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow py-12">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[var(--color-text-dark)] mb-4">PDF Tools Test Suite</h1>
            <p className="text-lg text-[var(--color-text-muted)]">
              Automated testing for all PDF processing tools
            </p>
          </div>

          {/* Test Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => runTests()}
                  disabled={isRunning}
                  className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isRunning ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Running Tests...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlay} />
                      <span>Run All Tests</span>
                    </>
                  )}
                </button>
              </div>

              {summary && (
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Total:</span>
                    <span>{summary.total}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-600">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span>{summary.passed}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-red-600">
                    <FontAwesomeIcon icon={faTimesCircle} />
                    <span>{summary.failed}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{summary.errors}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-dark)]">
                          {result.toolName}
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)]">ID: {result.toolId}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.status === 'pass'
                          ? 'bg-green-100 text-green-800'
                          : result.status === 'fail'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {result.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-[var(--color-text-dark)] font-medium">{result.message}</p>
                  </div>

                  {result.details && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border-gray)]">
                      <h4 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Details:</h4>
                      <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {results.length === 0 && !isRunning && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-12 text-center">
              <FontAwesomeIcon icon={faPlay} className="text-6xl text-[var(--color-text-muted)] mb-4" />
              <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-2">
                No tests run yet
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6">
                Click "Run All Tests" to start automated testing
              </p>
              <button
                onClick={() => runTests()}
                className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Run All Tests
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

