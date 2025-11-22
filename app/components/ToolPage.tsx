'use client';

import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faShieldHalved,
  faBolt,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { ToolConfig } from '../lib/tools';
import MergePDF from './tools/MergePDF';
import SplitPDF from './tools/SplitPDF';
import CompressPDF from './tools/CompressPDF';
import PDFToWord from './tools/PDFToWord';
import PDFToPowerPoint from './tools/PDFToPowerPoint';
import PDFToExcel from './tools/PDFToExcel';
import WordToPDF from './tools/WordToPDF';
import PowerPointToPDF from './tools/PowerPointToPDF';
import ExcelToPDF from './tools/ExcelToPDF';
import PDFToJPG from './tools/PDFToJPG';
import JPGToPDF from './tools/JPGToPDF';
import RotatePDF from './tools/RotatePDF';
import EditPDF from './tools/EditPDF';
import SignPDF from './tools/SignPDF';
import WatermarkPDF from './tools/WatermarkPDF';
import ProtectPDF from './tools/ProtectPDF';
import UnlockPDF from './tools/UnlockPDF';
import OrganizePDF from './tools/OrganizePDF';
import CropPDF from './tools/CropPDF';
import PageNumbersPDF from './tools/PageNumbersPDF';
import ComparePDF from './tools/ComparePDF';
import RedactPDF from './tools/RedactPDF';
import HTMLToPDF from './tools/HTMLToPDF';
import PDFToHTML from './tools/PDFToHTML';
import ScanToPDF from './tools/ScanToPDF';
import PDFToPDFA from './tools/PDFToPDFA';
import RepairPDF from './tools/RepairPDF';
import OCRPDF from './tools/OCRPDF';
import GenericTool from './tools/GenericTool';

interface ToolPageProps {
  tool: ToolConfig;
}

export default function ToolPage({ tool }: ToolPageProps) {
  // Render specialized component based on tool ID
  const renderToolComponent = () => {
    switch (tool.id) {
      case 'merge':
        return <MergePDF />;
      case 'split':
        return <SplitPDF />;
      case 'compress':
        return <CompressPDF />;
      case 'pdf-to-word':
        return <PDFToWord />;
      case 'pdf-to-ppt':
        return <PDFToPowerPoint />;
      case 'pdf-to-excel':
        return <PDFToExcel />;
      case 'word-to-pdf':
        return <WordToPDF />;
      case 'ppt-to-pdf':
        return <PowerPointToPDF />;
      case 'excel-to-pdf':
        return <ExcelToPDF />;
      case 'pdf-to-jpg':
        return <PDFToJPG />;
      case 'jpg-to-pdf':
        return <JPGToPDF />;
      case 'rotate-pdf':
        return <RotatePDF />;
      case 'edit-pdf':
        return <EditPDF />;
      case 'sign-pdf':
        return <SignPDF />;
      case 'watermark':
        return <WatermarkPDF />;
      case 'protect-pdf':
        return <ProtectPDF />;
      case 'unlock-pdf':
        return <UnlockPDF />;
      case 'organize-pdf':
        return <OrganizePDF />;
      case 'crop-pdf':
        return <CropPDF />;
      case 'page-numbers':
        return <PageNumbersPDF />;
      case 'compare-pdf':
        return <ComparePDF />;
      case 'redact-pdf':
        return <RedactPDF />;
      case 'html-to-pdf':
        return <HTMLToPDF />;
      case 'pdf-to-html':
        return <PDFToHTML />;
      case 'scan-to-pdf':
        return <ScanToPDF />;
      case 'pdf-to-pdfa':
        return <PDFToPDFA />;
      case 'repair-pdf':
        return <RepairPDF />;
      case 'ocr-pdf':
        return <OCRPDF />;
      default:
        return <GenericTool tool={tool} />;
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
      <Header />
      
      {/* Breadcrumb */}
      <section className="bg-white border-b border-[var(--color-border-gray)]">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">
              Home
            </Link>
            <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
            <span className="text-[var(--color-text-dark)] font-medium">{tool.title}</span>
          </div>
        </div>
      </section>

      <main className="flex-grow">
        {/* Tool Header */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-6 text-center">
            <div className={`${tool.iconBgColor} ${tool.iconColor} rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center`}>
              <FontAwesomeIcon icon={tool.icon} size="2x" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-dark)] mb-4">
              {tool.pageTitle}
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
              {tool.pageDescription}
            </p>
          </div>
        </section>

        {/* Tool-specific content */}
        {renderToolComponent()}

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--color-text-dark)] mb-4">
                Why Choose Our {tool.title} Tool?
              </h2>
              <p className="text-[var(--color-text-muted)]">Fast, secure, and easy to use</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-green-100 text-green-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FontAwesomeIcon icon={faShieldHalved} size="2x" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">100% Secure</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Your files are processed locally and never uploaded to our servers
                </p>
              </div>
              <div className="text-center">
                <div className="bg-yellow-100 text-yellow-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBolt} size="2x" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">Lightning Fast</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Process your PDF files in seconds with our optimized processing
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 text-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FontAwesomeIcon icon={faStar} size="2x" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">High Quality</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Maintain original quality and formatting of your documents
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

