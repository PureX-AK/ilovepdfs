'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toolsConfig } from '../../lib/tools';
import { loadDownloadResult } from '../../lib/workflow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faCheck,
  faClock,
  faDownload,
  faFileLines,
  faHardDrive,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

interface ToolDownloadPageProps {
  params: Promise<{ tool: string }>;
}

export default function ToolDownloadPage({ params }: ToolDownloadPageProps) {
  const router = useRouter();
  const [toolId, setToolId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number | undefined>(undefined);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const { tool } = await params;
      setToolId(tool);

      const result = loadDownloadResult(tool);
      if (result) {
        setDownloadUrl(result.url);
        setFilename(result.filename);
        setFileCount(result.fileCount);
        setCreatedAt(result.createdAt);
      }
    })();
  }, [params]);

  if (!toolId) {
    return null;
  }

  const tool = toolsConfig[toolId];
  const isWordTool = toolId === 'pdf-to-word';

  const handleDownload = () => {
    if (!downloadUrl || !filename) return;

    try {
      setIsDownloading(true);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    }
  };

  const createdAtDisplay = createdAt
    ? new Date(createdAt).toLocaleString()
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
      <Header />

      {/* Breadcrumb */}
      <section className="bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center text-sm text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              Home
            </button>
            <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
            {tool && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/${toolId}`)}
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  {tool.title}
                </button>
                <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
              </>
            )}
            <span className="text-[var(--color-text-dark)] font-medium">
              Download
            </span>
          </div>
        </div>
      </section>

      <main className="flex-grow">
        {/* Success Header */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-6 max-w-4xl">
              <div className="text-center mb-8">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center absolute inset-0 animate-ping opacity-60" />
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center relative">
                  <FontAwesomeIcon icon={faCheck} className="text-white text-4xl" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-[var(--color-text-dark)] mb-3">
                {tool ? `${tool.title} Completed!` : 'File Ready!'}
              </h1>
              <p className="text-lg text-[var(--color-text-muted)]">
                {tool
                  ? `Your ${tool.title.toLowerCase()} result is ready to download.`
                  : 'Your file is ready to download.'}
              </p>
            </div>
          </div>
        </section>

        {/* Download Card */}
        <section className="py-8">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="bg-white rounded-xl border-2 border-[var(--color-border-gray)] p-6 mb-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-16 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-3xl font-bold">
                      {isWordTool ? 'DOCX' : 'PDF'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-[var(--color-text-dark)] mb-2 truncate">
                      {filename || (isWordTool ? 'output.docx' : 'output.pdf')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)] mb-3">
                      {fileCount !== undefined && (
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon icon={faLayerGroup} />
                          <span>{fileCount} file{fileCount === 1 ? '' : 's'}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faFileLines} />
                      <span>{isWordTool ? 'Word document (DOCX)' : 'PDF document'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faHardDrive} />
                        <span>Processed</span>
                      </div>
                    </div>
                    {createdAtDisplay && (
                      <div className="flex items-center space-x-2 text-xs text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faClock} />
                        <span>Created: {createdAtDisplay}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!downloadUrl || !filename || isDownloading}
                  className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center space-x-2 flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faDownload} />
                  <span>
                    {isDownloading
                      ? 'Downloading...'
                      : downloadUrl
                      ? isWordTool
                        ? 'Download Word file'
                        : 'Download PDF'
                      : 'No file available'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(tool ? `/${toolId}` : '/')}
                  className="border-2 border-[var(--color-border-gray)] text-[var(--color-text-dark)] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back to Tool
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


