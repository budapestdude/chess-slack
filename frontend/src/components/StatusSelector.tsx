import { useState, useRef, useEffect } from 'react';
import { userService } from '../services/user';
import websocketService from '../services/websocket';
import PresenceIndicator from './PresenceIndicator';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface StatusOption {
  status: 'online' | 'away' | 'busy' | 'offline';
  label: string;
  description: string;
}

const statusOptions: StatusOption[] = [
  { status: 'online', label: 'Active', description: 'Available to chat' },
  { status: 'away', label: 'Away', description: 'Not at my desk' },
  { status: 'busy', label: 'Busy', description: 'Do not disturb' },
  { status: 'offline', label: 'Invisible', description: 'Appear offline' },
];

interface StatusSelectorProps {
  currentStatus: 'online' | 'away' | 'busy' | 'offline';
  onStatusChange?: (status: 'online' | 'away' | 'busy' | 'offline') => void;
}

export default function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'online' | 'away' | 'busy' | 'offline'>(currentStatus);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine best position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 220; // Approximate height of dropdown
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;

      // Show below if not enough space above, or if more space below
      setPosition(spaceAbove < dropdownHeight && spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  }, [isOpen]);

  const handleStatusChange = async (newStatus: 'online' | 'away' | 'busy' | 'offline') => {
    try {
      setStatus(newStatus);
      setIsOpen(false);

      // Update via API
      await userService.setPresence(newStatus);

      // Also emit via WebSocket for immediate update
      websocketService.setPresence(newStatus);

      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      toast.success(`Status set to ${newStatus}`);
    } catch (error) {
      console.error('Failed to set status:', error);
      toast.error('Failed to update status');
      setStatus(currentStatus); // Revert on error
    }
  };

  const currentOption = statusOptions.find((opt) => opt.status === status) || statusOptions[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <PresenceIndicator status={status} size="md" />
        <span className="text-sm font-medium text-gray-700">{currentOption.label}</span>
        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Set your status</h3>
          </div>

          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.status}
                onClick={() => handleStatusChange(option.status)}
                className="w-full flex items-start gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="pt-1">
                  <PresenceIndicator status={option.status} size="md" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
                {status === option.status && (
                  <div className="pt-1">
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}