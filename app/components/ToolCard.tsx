import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ToolCardProps {
  id: string;
  title: string;
  description: string;
  icon: IconDefinition;
  iconBgColor: string;
  iconColor: string;
  isNew?: boolean;
}

export default function ToolCard({
  id,
  title,
  description,
  icon,
  iconBgColor,
  iconColor,
  isNew = false,
}: ToolCardProps) {
  return (
    <Link href={`/${id}`} className="block">
      <div
        id={id}
        className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative"
      >
        {isNew && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
            New!
          </div>
        )}
        <div className="flex flex-col items-center text-center">
          <div className={`${iconBgColor} ${iconColor} rounded-full p-4 mb-4`}>
            <FontAwesomeIcon icon={icon} size="2x" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-2">{title}</h3>
          <p className="text-[var(--color-text-muted)] text-sm">{description}</p>
        </div>
      </div>
    </Link>
  );
}

