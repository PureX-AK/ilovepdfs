import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function WorkflowCard() {
  return (
    <div className="bg-gradient-to-br from-orange-100 to-pink-100 p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-2">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
        <div className="absolute top-4 right-4 w-8 h-8 bg-orange-400 rounded transform rotate-45"></div>
        <div className="absolute top-12 right-8 w-6 h-6 bg-pink-400 rounded transform rotate-12"></div>
        <div className="absolute top-20 right-16 w-10 h-10 bg-orange-300 rounded-full"></div>
      </div>
      
      <div className="relative z-10 flex flex-col">
        <h3 className="text-2xl font-bold text-[var(--color-text-dark)] mb-3">
          Create a workflow
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">
          Create custom workflows with your favorite tools, automate tasks, and reuse them anytime.
        </p>
        <button className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-2 self-start">
          Create workflow
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </div>
  );
}

