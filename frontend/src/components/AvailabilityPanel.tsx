import React, { useState } from 'react';
import { Clock, Calendar, Circle } from 'lucide-react';
import { Event } from '../services/calendar';

interface AvailabilityPanelProps {
  currentStatus: 'available' | 'busy' | 'out-of-office';
  onStatusChange: (status: 'available' | 'busy' | 'out-of-office') => void;
  upcomingEvents: Event[];
}

/**
 * AvailabilityPanel Component
 * Side panel for managing user availability status and viewing upcoming events
 * Features: status toggle, upcoming events list, time display
 */
const AvailabilityPanel: React.FC<AvailabilityPanelProps> = ({
  currentStatus,
  onStatusChange,
  upcomingEvents,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Status configuration
  const statuses = [
    {
      value: 'available' as const,
      label: 'Available',
      icon: Circle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      hoverBg: 'hover:bg-green-100',
      activeBg: 'bg-green-100',
    },
    {
      value: 'busy' as const,
      label: 'Busy',
      icon: Circle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      hoverBg: 'hover:bg-red-100',
      activeBg: 'bg-red-100',
    },
    {
      value: 'out-of-office' as const,
      label: 'Out of Office',
      icon: Circle,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      hoverBg: 'hover:bg-gray-100',
      activeBg: 'bg-gray-100',
    },
  ];

  // Format event time
  const formatEventTime = (event: Event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (event.allDay) {
      return 'All day';
    }

    const formatTime = (date: Date) =>
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Format event date
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    // Check if this week
    const daysUntil = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Show full date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get event color classes
  const getEventColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-l-blue-500',
      green: 'border-l-green-500',
      red: 'border-l-red-500',
      purple: 'border-l-purple-500',
      orange: 'border-l-orange-500',
      yellow: 'border-l-yellow-500',
      pink: 'border-l-pink-500',
      gray: 'border-l-gray-500',
    };
    return colors[color] || colors.blue;
  };

  const currentStatusConfig = statuses.find((s) => s.value === currentStatus);

  return (
    <div className="bg-white border-l border-gray-200 w-80 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Availability
        </h2>

        {/* Status Toggle */}
        <div className="space-y-2">
          {statuses.map((status) => {
            const Icon = status.icon;
            const isActive = currentStatus === status.value;

            return (
              <button
                key={status.value}
                onClick={() => onStatusChange(status.value)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  border transition-all duration-200
                  ${isActive ? status.activeBg : status.bg}
                  ${status.border}
                  ${isActive ? '' : status.hoverBg}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                `}
                aria-pressed={isActive}
                aria-label={`Set status to ${status.label}`}
              >
                <Icon
                  className={`w-4 h-4 ${status.color} ${
                    isActive ? 'fill-current' : ''
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {status.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </div>

        {/* Current Status Display */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Currently:</span>
            <span className={`font-medium ${currentStatusConfig?.color}`}>
              {currentStatusConfig?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming Events
            </h3>
            <span className="text-xs text-gray-500">
              Next {Math.min(upcomingEvents.length, 5)}
            </span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No upcoming events</p>
              <p className="text-xs text-gray-400 mt-1">
                Your schedule is clear!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className={`
                    p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100
                    transition-colors cursor-pointer
                    ${getEventColorClasses(event.color)}
                  `}
                >
                  {/* Event Title */}
                  <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">
                    {event.title}
                  </h4>

                  {/* Event Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatEventDate(event.startTime)}</span>
                  </div>

                  {/* Event Time */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{formatEventTime(event)}</span>
                  </div>

                  {/* Attendee Count */}
                  {event.attendees.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <div className="flex -space-x-1">
                        {event.attendees.slice(0, 3).map((attendee, idx) => (
                          <div
                            key={attendee.userId}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-medium text-white"
                            title={attendee.user?.name}
                          >
                            {attendee.user?.avatar ? (
                              <img
                                src={attendee.user.avatar}
                                alt={attendee.user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{attendee.user?.name?.[0] || '?'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {event.attendees.length > 3 && (
                        <span className="text-xs text-gray-500 ml-1">
                          +{event.attendees.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {upcomingEvents.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {upcomingEvents.filter((e) => {
                const today = new Date();
                const eventDate = new Date(e.startTime);
                return eventDate.toDateString() === today.toDateString();
              }).length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Today</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityPanel;
