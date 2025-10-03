import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import AvailabilityPanel from '../components/AvailabilityPanel';
import {
  Event,
  CreateEventData,
  UpdateEventData,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../services/calendar';

/**
 * CalendarPage Component
 * Full-featured calendar interface with month, week, and day views
 * Features: view switching, event creation/editing, navigation, responsive design
 */
const CalendarPage: React.FC = () => {
  // State management
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'available' | 'busy' | 'out-of-office'
  >('available');

  // Mock data - replace with actual API calls
  const workspaceId = 'workspace-1';
  const currentUserId = 'user-1';
  const workspaceMembers = [
    { id: 'user-1', name: 'John Doe', avatar: '' },
    { id: 'user-2', name: 'Jane Smith', avatar: '' },
    { id: 'user-3', name: 'Bob Johnson', avatar: '' },
    { id: 'user-4', name: 'Alice Williams', avatar: '' },
  ];

  // Load events when date or view changes
  useEffect(() => {
    loadEvents();
  }, [currentDate, view]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const fetchedEvents = await getEvents(workspaceId, start, end);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      // For demo purposes, use mock data if API fails
      setEvents(getMockEvents());
    } finally {
      setIsLoading(false);
    }
  };

  // Get date range based on current view
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (data: CreateEventData | UpdateEventData) => {
    try {
      if (selectedEvent) {
        await updateEvent(workspaceId, selectedEvent.id, data as UpdateEventData);
      } else {
        await createEvent(workspaceId, data as CreateEventData);
      }
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await deleteEvent(workspaceId, selectedEvent.id);
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  // Get calendar grid data
  const getCalendarGrid = () => {
    if (view === 'month') {
      return getMonthGrid();
    } else if (view === 'week') {
      return getWeekGrid();
    } else {
      return getDayGrid();
    }
  };

  // Generate month grid
  const getMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === date.toDateString();
      });

      currentWeek.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString(),
        events: dayEvents,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return weeks;
  };

  // Generate week grid
  const getWeekGrid = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);

      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === date.toDateString();
      });

      days.push({
        date,
        isToday: date.toDateString() === new Date().toDateString(),
        events: dayEvents,
      });
    }

    return days;
  };

  // Generate day grid
  const getDayGrid = () => {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    return { date: currentDate, events: dayEvents };
  };

  // Get upcoming events for availability panel
  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter((event) => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  };

  // Format display title
  const getDisplayTitle = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Mock events for demo
  const getMockEvents = (): Event[] => {
    const today = new Date();
    return [
      {
        id: '1',
        workspaceId,
        title: 'Team Standup',
        description: 'Daily team sync',
        startTime: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
        endTime: new Date(today.setHours(9, 30, 0, 0)).toISOString(),
        allDay: false,
        location: 'Zoom',
        color: 'blue',
        createdBy: 'user-1',
        attendees: [
          { userId: 'user-1', status: 'accepted' },
          { userId: 'user-2', status: 'accepted' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              New Event
            </button>
          </div>

          {/* Navigation and View Controls */}
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevious}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
              <button
                onClick={handleToday}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Today
              </button>
              <h2 className="text-lg font-semibold text-gray-900 ml-2">
                {getDisplayTitle()}
              </h2>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${
                      view === v
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                  aria-pressed={view === v}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6">
          {view === 'month' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              {getMonthGrid().map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`
                        min-h-[120px] p-2 border-r border-gray-200 last:border-r-0
                        ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                        ${day.isToday ? 'bg-blue-50' : ''}
                      `}
                    >
                      <div
                        className={`
                          text-sm font-medium mb-2
                          ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                          ${day.isToday ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center' : ''}
                        `}
                      >
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.events.slice(0, 3).map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onClick={handleEventClick}
                            view="month"
                          />
                        ))}
                        {day.events.length > 3 && (
                          <div className="text-xs text-gray-500 pl-2">
                            +{day.events.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === 'week' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Week Headers */}
              <div className="grid grid-cols-8 border-b border-gray-200">
                <div className="p-3 bg-gray-50 border-r border-gray-200" />
                {getWeekGrid().map((day, index) => (
                  <div
                    key={index}
                    className={`
                      p-3 text-center border-r border-gray-200 last:border-r-0
                      ${day.isToday ? 'bg-blue-50' : 'bg-gray-50'}
                    `}
                  >
                    <div className="text-xs font-medium text-gray-600">
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      className={`
                        text-lg font-semibold mt-1
                        ${day.isToday ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto' : 'text-gray-900'}
                      `}
                    >
                      {day.date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="overflow-y-auto max-h-[600px]">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                    <div className="p-2 text-xs text-gray-500 text-right border-r border-gray-200">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                    {getWeekGrid().map((day, index) => (
                      <div
                        key={index}
                        className="p-2 border-r border-gray-100 last:border-r-0 min-h-[60px]"
                      >
                        {day.events
                          .filter((event) => {
                            const eventHour = new Date(event.startTime).getHours();
                            return eventHour === hour;
                          })
                          .map((event) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              onClick={handleEventClick}
                              view="week"
                            />
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Day Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">
                    {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {currentDate.getDate()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Day Events */}
              <div className="overflow-y-auto max-h-[600px]">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourEvents = getDayGrid().events.filter((event) => {
                    const eventHour = new Date(event.startTime).getHours();
                    return eventHour === hour;
                  });

                  return (
                    <div
                      key={hour}
                      className="grid grid-cols-12 border-b border-gray-100 min-h-[80px]"
                    >
                      <div className="col-span-2 p-4 text-sm text-gray-500 text-right border-r border-gray-200">
                        {hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
                      </div>
                      <div className="col-span-10 p-4 space-y-2">
                        {hourEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onClick={handleEventClick}
                            view="day"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Availability Panel */}
      <AvailabilityPanel
        currentStatus={availabilityStatus}
        onStatusChange={setAvailabilityStatus}
        upcomingEvents={getUpcomingEvents()}
      />

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        event={selectedEvent}
        workspaceMembers={workspaceMembers}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default CalendarPage;
