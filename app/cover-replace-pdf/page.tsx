import { toolsConfig } from '../lib/tools';
import CoverReplacePDF from '../components/tools/CoverReplacePDF';

export const metadata = {
  title: toolsConfig['replace-text-pdf']?.pageTitle || 'Cover & Replace Text in PDF',
};

export default function CoverReplacePdfPage() {
  return <CoverReplacePDF />;
}


