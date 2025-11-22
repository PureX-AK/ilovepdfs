import ToolCard from './ToolCard';
import WorkflowCard from './WorkflowCard';
import { toolsConfig } from '../lib/tools';

const tools = Object.values(toolsConfig);

export default function ToolSelection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--color-text-dark)]">Explore Our Tools</h2>
          <p className="text-md text-[var(--color-text-muted)] mt-2">Choose a tool below to get started.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {tools.map((tool) => (
            <ToolCard key={tool.id} {...tool} />
          ))}
          <WorkflowCard />
        </div>
      </div>
    </section>
  );
}
