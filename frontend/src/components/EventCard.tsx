import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { Event } from '../services/calendar';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  view: 'month' | 'week' | 'day';
}

/**
 * EventCard Component
 * Compact, color-coded event display for calendar grids
 * Features: time display, location indicator, attendee count, hover effects
 */
const EventCard: React.FC<EventCardProps> = ({ event, onClick, view }) => {
  // Color mapping for event cards
  const colorClasses: Record<string, { bg: string; border: string; hover: string; text: string }> = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-l-blue-500',
      hover: 'hover:bg-blue-100',
      text: 'text-blue-900',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-l-green-500',
      hover: 'hover:bg-green-100',
      text: 'text-green-900',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-l-red-500',
      hover: 'hover:bg-red-100',
      text: 'text-red-900',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-l-purple-500',
      hover: 'hover:bg-purple-100',
      text: 'text-purple-900',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-l-orange-500',
      hover: 'hover:bg-orange-100',
      text: 'text-orange-900',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-l-yellow-500',
      hover: 'hover:bg-yellow-100',
      text: 'text-yellow-900',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-l-gray-500',
      hover: 'hover:bg-gray-100',
      text: 'text-gray-900',
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-l-pink-500',
      hover: 'hover:bg-pink-100',
      text: 'text-pink-900',
    },
  };

  const colors = colorClasses[event.color] || colorClasses.blue;

  // Format time display
  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calculate event duration for height in day/week view
  const getEventHeight = () => {
    if (view === 'month') return 'auto';

    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    // Each hour is 60px, minimum 30px
    const height = Math.max((durationMinutes / 60) * 60, 30);
    return `${height}px`;
  };

  // Render attendee avatars (max 3)
  const renderAttendees = () => {
    const visibleAttendees = event.attendees.slice(0, 3);
    const remainingCount = event.attendees.length - 3;

    if (event.attendees.length === 0) return null;

    return (
      <div className="flex items-center -space-x-1">
        {visibleAttendees.map((attendee, index) => (
          <div
            key={attendee.userId}
            className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-medium text-white"
            title={attendee.user?.name || 'User'}
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
        {remainingCount > 0 && (
          <div className="w-5 h-5 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-medium text-gray-700">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <button
      onClick={() => onClick(event)}
      className={`
        w-full text-left rounded-md border-l-4 p-2
        transition-all duration-200 ease-in-out
        ${colors.bg} ${colors.border} ${colors.hover} ${colors.text}
        shadow-sm hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        group cursor-pointer
      `}
      style={{ height: view !== 'month' ? getEventHeight() : 'auto' }}
      aria-label={`Event: ${event.title}`}
    >
      <div className="flex flex-col gap-1 h-full">
        {/* Time and title */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {!event.allDay && view !== 'month' && (
              <div className="flex items-center gap-1 text-xs font-medium mb-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{formatTime(event.startTime)}</span>
              </div>
            )}
            <h3
              className={`
                font-semibold truncate
                ${view === 'month' ? 'text-xs' : 'text-sm'}
              `}
            >
              {event.title}
            </h3>
          </div>
        </div>

        {/* Location and attendee info - only show in week/day view */}
        {view !== 'month' && (
          <div className="flex items-center gap-2 text-xs mt-auto">
            {event.location && (
              <div className="flex items-center gap-1" title={event.location}>
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </div>
            )}
            {event.attendees.length > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span>{event.attendees.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Month view compact display */}
        {view === 'month' && (
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1 text-xs">
              {!event.allDay && (
                <span className="font-medium">{formatTime(event.startTime)}</span>
              )}
              {event.location && (
                <MapPin className="w-3 h-3 flex-shrink-0 ml-1" />
              )}
            </div>
            {event.attendees.length > 0 && (
              <div className="flex items-center gap-1">
                {renderAttendees()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div
        className={`
          absolute inset-0 rounded-md opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          pointer-events-none
          ring-2 ring-inset
          ${event.color === 'blue' && 'ring-blue-300'}
          ${event.color === 'green' && 'ring-green-300'}
          ${event.color === 'red' && 'ring-red-300'}
          ${event.color === 'purple' && 'ring-purple-300'}
          ${event.color === 'orange' && 'ring-orange-300'}
          ${event.color === 'yellow' && 'ring-yellow-300'}
        `}
      />
    </button>
  );
};

export default EventCard;
