import { notFound } from 'next/navigation';
import ToolPage from '../components/ToolPage';
import { toolsConfig } from '../lib/tools';

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolId } = await params;
  const tool = toolsConfig[toolId];
  
  if (!tool) {
    return {
      title: 'Tool Not Found',
    };
  }

  return {
    title: `${tool.pageTitle} - pagalPDF`,
    description: tool.pageDescription,
  };
}

export default async function ToolPageRoute({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolId } = await params;
  const tool = toolsConfig[toolId];

  if (!tool) {
    notFound();
  }

  return <ToolPage tool={tool} />;
}

