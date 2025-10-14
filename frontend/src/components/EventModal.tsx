import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Trash2, Check } from 'lucide-react';
import { Event, CreateEventData, UpdateEventData } from '../services/calendar';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEventData | UpdateEventData) => Promise<void>;
  onDelete?: () => Promise<void>;
  event?: Event | null;
  workspaceMembers: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId: string;
}

/**
 * EventModal Component
 * Full-featured modal for creating and editing calendar events
 * Features: date/time pickers, color selection, attendee management, RSVP status
 */
const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  workspaceMembers,
  currentUserId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('blue');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Available colors for events
  const colors = [
    { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { name: 'green', label: 'Green', class: 'bg-green-500' },
    { name: 'red', label: 'Red', class: 'bg-red-500' },
    { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { name: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { name: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { name: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { name: 'gray', label: 'Gray', class: 'bg-gray-500' },
  ];

  // Initialize form with event data or defaults
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');

      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0, 5));
      setAllDay(event.allDay);
      setLocation(event.location || '');
      setColor(event.color);
      setSelectedAttendees(event.attendees.map((a) => a.userId));
    } else {
      // Default to current time rounded to next hour
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);

      const oneHourLater = new Date(now);
      oneHourLater.setHours(oneHourLater.getHours() + 1);

      setStartDate(now.toISOString().split('T')[0]);
      setStartTime(now.toTimeString().slice(0, 5));
      setEndDate(oneHourLater.toISOString().split('T')[0]);
      setEndTime(oneHourLater.toTimeString().slice(0, 5));
    }
  }, [event]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setLocation('');
      setAllDay(false);
      setColor('blue');
      setSelectedAttendees([]);
      setErrors({});
    }
  }, [isOpen]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!allDay) {
      if (!startTime) {
        newErrors.startTime = 'Start time is required';
      }
      if (!endTime) {
        newErrors.endTime = 'End time is required';
      }
    }

    // Check if end is after start
    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
    const endDateTime = new Date(`${endDate}T${endTime || '23:59'}`);

    if (endDateTime <= startDateTime) {
      newErrors.endDate = 'End must be after start';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00.000Z`
        : new Date(`${startDate}T${startTime}`).toISOString();

      const endDateTime = allDay
        ? `${endDate}T23:59:59.999Z`
        : new Date(`${endDate}T${endTime}`).toISOString();

      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        location: location.trim() || undefined,
        color,
        attendeeIds: selectedAttendees,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setErrors({ submit: 'Failed to save event. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;

    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsSubmitting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Error deleting event:', error);
        setErrors({ submit: 'Failed to delete event. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Toggle attendee selection
  const toggleAttendee = (userId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Get current user's RSVP status
  const getCurrentUserRsvp = () => {
    if (!event) return null;
    return event.attendees.find((a) => a.userId === currentUserId);
  };

  const userRsvp = getCurrentUserRsvp();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2
            id="event-modal-title"
            className="text-xl font-semibold text-gray-900 flex items-center gap-2"
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`
                w-full px-4 py-2 border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.title ? 'border-red-300' : 'border-gray-300'}
              `}
              placeholder="Team meeting, Project deadline..."
              aria-required="true"
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="event-description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add details about the event..."
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date/Time */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.startDate ? 'border-red-300' : 'border-gray-300'}
                `}
                aria-required="true"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`
                    w-full px-4 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.startTime ? 'border-red-300' : 'border-gray-300'}
                  `}
                  aria-required="true"
                />
              )}
            </div>

            {/* End Date/Time */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`
                  w-full px-4 py-2 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.endDate ? 'border-red-300' : 'border-gray-300'}
                `}
                aria-required="true"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`
                    w-full px-4 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.endTime ? 'border-red-300' : 'border-gray-300'}
                  `}
                  aria-required="true"
                />
              )}
            </div>
          </div>

          {errors.endDate && errors.endDate !== 'End date is required' && (
            <p className="text-red-500 text-sm">{errors.endDate}</p>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              id="all-day"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="all-day" className="text-sm font-medium text-gray-700">
              All day event
            </label>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="event-location"
              className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Conference room, Zoom link, address..."
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`
                    w-10 h-10 rounded-lg transition-all
                    ${c.class}
                    ${
                      color === c.name
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    }
                  `}
                  aria-label={`Select ${c.label} color`}
                  title={c.label}
                >
                  {color === c.name && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendees
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {workspaceMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAttendee(member.id)}
                  className={`
                    w-full px-4 py-2 flex items-center gap-3
                    hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0
                    ${selectedAttendees.includes(member.id) ? 'bg-blue-50' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedAttendees.includes(member.id)}
                    onChange={() => {}}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-label={`Select ${member.name}`}
                  />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.name[0]
                    )}
                  </div>
                  <span className="text-sm text-gray-900">{member.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RSVP Status Display */}
          {userRsvp && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Your RSVP:</span>{' '}
                <span className="capitalize">{userRsvp.status}</span>
              </p>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Event'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
