import { useState, useRef, useEffect, FormEvent } from 'react';
import { PlusIcon, TagIcon, CheckIcon } from '@heroicons/react/24/outline';
import TaskLabel, { Label, LabelColor } from './TaskLabel';

interface LabelSelectorProps {
  /** Currently selected labels */
  selectedLabels: Label[];
  /** Available labels to choose from */
  availableLabels: Label[];
  /** Callback when labels are added or removed */
  onLabelsChange: (labels: Label[]) => void;
  /** Callback when a new label is created */
  onCreateLabel?: (name: string, color: LabelColor) => Promise<Label>;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional className for wrapper */
  className?: string;
}

/**
 * Color options with visual indicators and semantic descriptions
 */
const colorOptions: Array<{
  value: LabelColor;
  label: string;
  description: string;
  previewClass: string;
}> = [
  {
    value: 'blue',
    label: 'Blue',
    description: 'Information & productivity',
    previewClass: 'bg-blue-500'
  },
  {
    value: 'green',
    label: 'Green',
    description: 'Success & completion',
    previewClass: 'bg-green-500'
  },
  {
    value: 'yellow',
    label: 'Yellow',
    description: 'Warning & in progress',
    previewClass: 'bg-yellow-500'
  },
  {
    value: 'orange',
    label: 'Orange',
    description: 'Urgent & important',
    previewClass: 'bg-orange-500'
  },
  {
    value: 'red',
    label: 'Red',
    description: 'Critical & blocked',
    previewClass: 'bg-red-500'
  },
  {
    value: 'purple',
    label: 'Purple',
    description: 'Planning & review',
    previewClass: 'bg-purple-500'
  },
  {
    value: 'pink',
    label: 'Pink',
    description: 'Design & testing',
    previewClass: 'bg-pink-500'
  },
  {
    value: 'gray',
    label: 'Gray',
    description: 'Neutral & archived',
    previewClass: 'bg-gray-500'
  }
];

/**
 * LabelSelector Component
 *
 * A comprehensive dropdown component for selecting and creating labels.
 * Features:
 * - Search/filter existing labels
 * - Create new labels with color picker
 * - Visual color indicators
 * - Keyboard navigation support
 * - Click-outside-to-close behavior
 * - Accessible ARIA labels and roles
 *
 * @example
 * <LabelSelector
 *   selectedLabels={task.labels}
 *   availableLabels={allLabels}
 *   onLabelsChange={updateTaskLabels}
 *   onCreateLabel={createNewLabel}
 * />
 */
export default function LabelSelector({
  selectedLabels,
  availableLabels,
  onLabelsChange,
  onCreateLabel,
  placeholder = 'Add labels...',
  className = ''
}: LabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState<LabelColor>('blue');
  const [isCreating, setIsCreating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter available labels based on search and exclude already selected
  const filteredLabels = availableLabels.filter(label => {
    const isNotSelected = !selectedLabels.some(sl => sl.id === label.id);
    const matchesSearch = label.name.toLowerCase().includes(searchQuery.toLowerCase());
    return isNotSelected && matchesSearch;
  });

  const handleToggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some(sl => sl.id === label.id);

    if (isSelected) {
      onLabelsChange(selectedLabels.filter(sl => sl.id !== label.id));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  const handleRemoveLabel = (labelId: string) => {
    onLabelsChange(selectedLabels.filter(sl => sl.id !== labelId));
  };

  const handleCreateLabel = async (e: FormEvent) => {
    e.preventDefault();

    if (!newLabelName.trim() || !onCreateLabel) return;

    setIsCreating(true);
    try {
      const newLabel = await onCreateLabel(newLabelName.trim(), selectedColor);
      onLabelsChange([...selectedLabels, newLabel]);

      // Reset form
      setNewLabelName('');
      setSelectedColor('blue');
      setShowCreateForm(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create label:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isLabelSelected = (labelId: string) => {
    return selectedLabels.some(sl => sl.id === labelId);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex items-center gap-2 px-3 py-2
          text-sm font-medium text-gray-700
          bg-white border border-gray-300 rounded-lg
          hover:bg-gray-50 hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-all duration-150
        "
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <TagIcon className="w-4 h-4 text-gray-500" />
        <span>{placeholder}</span>
      </button>

      {/* Selected Labels Display */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Selected labels">
          {selectedLabels.map(label => (
            <div key={label.id} role="listitem">
              <TaskLabel
                label={label}
                onRemove={handleRemoveLabel}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-2 w-80
            bg-white rounded-lg shadow-xl border border-gray-200
            z-50 overflow-hidden
          "
          role="dialog"
          aria-label="Label selector"
        >
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search labels..."
              className="
                w-full px-3 py-2 text-sm
                border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                placeholder-gray-400
              "
              aria-label="Search labels"
            />
          </div>

          {/* Create New Label Form */}
          {showCreateForm ? (
            <form onSubmit={handleCreateLabel} className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <label htmlFor="label-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Label name
                  </label>
                  <input
                    id="label-name"
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="e.g., Bug, Feature, Urgent"
                    className="
                      w-full px-3 py-2 text-sm
                      border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                    "
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Select color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map(({ value, label, previewClass }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedColor(value)}
                        className={`
                          relative p-2 rounded-md border-2 transition-all duration-150
                          ${selectedColor === value
                            ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                            : 'border-transparent hover:border-gray-300'
                          }
                        `}
                        aria-label={`Select ${label} color`}
                        title={label}
                      >
                        <div className={`w-full h-6 rounded ${previewClass}`} />
                        {selectedColor === value && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewLabelName('');
                      setSelectedColor('blue');
                    }}
                    className="
                      flex-1 px-3 py-2 text-sm font-medium text-gray-700
                      border border-gray-300 rounded-md
                      hover:bg-gray-50 transition-colors
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newLabelName.trim() || isCreating}
                    className="
                      flex-1 px-3 py-2 text-sm font-medium text-white
                      bg-primary-600 rounded-md
                      hover:bg-primary-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            onCreateLabel && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="
                  w-full flex items-center gap-2 px-3 py-2
                  text-sm font-medium text-primary-600
                  border-b border-gray-200
                  hover:bg-primary-50 transition-colors
                "
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create new label</span>
              </button>
            )
          )}

          {/* Available Labels List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredLabels.length > 0 ? (
              <div className="py-1" role="listbox" aria-label="Available labels">
                {filteredLabels.map(label => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleToggleLabel(label)}
                    className="
                      w-full flex items-center gap-3 px-3 py-2
                      hover:bg-gray-50 transition-colors
                      text-left
                    "
                    role="option"
                    aria-selected={isLabelSelected(label.id)}
                  >
                    <div className="flex-shrink-0">
                      <TaskLabel label={label} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0" />

                    {isLabelSelected(label.id) && (
                      <div className="flex-shrink-0">
                        <CheckIcon className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                {searchQuery ? (
                  <>
                    <p>No labels found matching "{searchQuery}"</p>
                    {onCreateLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewLabelName(searchQuery);
                          setShowCreateForm(true);
                        }}
                        className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Create "{searchQuery}"
                      </button>
                    )}
                  </>
                ) : (
                  <p>No labels available</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
