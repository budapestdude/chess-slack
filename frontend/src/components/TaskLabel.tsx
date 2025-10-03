import { XMarkIcon } from '@heroicons/react/20/solid';

/**
 * Label color type with comprehensive palette
 * Each color includes semantic meaning and accessibility considerations
 */
export type LabelColor =
  | 'blue'    // Information, trust, productivity
  | 'green'   // Success, completion, positive
  | 'yellow'  // Warning, attention, in progress
  | 'orange'  // Urgent, important, priority
  | 'red'     // Critical, blocked, high priority
  | 'purple'  // Creative, planning, review
  | 'pink'    // Design, testing, feedback
  | 'gray';   // Neutral, archived, low priority

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

interface TaskLabelProps {
  label: Label;
  /** Show remove button for interactive label management */
  onRemove?: (labelId: string) => void;
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Color mapping with carefully selected shades for optimal contrast and aesthetics
 * Background: Soft, approachable tones (100-200 range)
 * Text: Strong contrast for WCAG AA compliance (700-900 range)
 * Border: Subtle definition (300-400 range)
 */
const colorStyles: Record<LabelColor, string> = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
};

/**
 * Size variants with consistent spacing scale (4px base unit)
 */
const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
};

/**
 * Icon size mapping to maintain visual balance
 */
const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

/**
 * TaskLabel Component
 *
 * A versatile colored tag component for categorizing and organizing tasks.
 * Features:
 * - 8 semantic color options with optimal contrast ratios
 * - Optional remove functionality for interactive use cases
 * - Three size variants for different UI contexts
 * - Keyboard accessible with proper focus states
 * - Smooth hover transitions for polish
 *
 * @example
 * <TaskLabel label={{ id: '1', name: 'Bug', color: 'red' }} />
 * <TaskLabel label={{ id: '2', name: 'Feature', color: 'blue' }} onRemove={handleRemove} size="lg" />
 */
export default function TaskLabel({
  label,
  onRemove,
  size = 'md',
  className = ''
}: TaskLabelProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    onRemove?.(label.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onRemove && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      onRemove(label.id);
    }
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        transition-colors duration-150
        ${colorStyles[label.color]}
        ${sizeStyles[size]}
        ${className}
      `}
      role="status"
      aria-label={`Label: ${label.name}`}
    >
      <span className="truncate max-w-[150px]">{label.name}</span>

      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          onKeyDown={handleKeyDown}
          className={`
            flex-shrink-0 rounded-full
            hover:bg-black hover:bg-opacity-10
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
            transition-colors duration-150
            ${iconSizes[size]}
          `}
          aria-label={`Remove ${label.name} label`}
          tabIndex={0}
        >
          <XMarkIcon className="w-full h-full" />
        </button>
      )}
    </span>
  );
}
