import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  MessageSquare,
  ClipboardList,
  Lightbulb,
  Plus,
  Trash2,
  Clock,
  Users,
  MapPin,
  Link as LinkIcon,
  Save,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Video,
  FileText,
  Tag,
  User,
  Sparkles,
} from 'lucide-react';
import * as meetingNotesApi from '../services/meetingNotes';

/**
 * MeetingPage Component
 * Hub for meeting and communication tools
 */
const MeetingPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam && ['notes', 'calendar', 'standup', 'decisions'].includes(toolParam)) {
      setActiveToolId(toolParam);
    }
  }, [searchParams]);

  const tools = [
    { id: 'notes', name: 'Meeting Notes', icon: FileText, color: 'blue', description: 'Templates and collaborative notes' },
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon, color: 'green', description: 'Team calendar and scheduling' },
    { id: 'standup', name: 'Standup Bot', icon: MessageSquare, color: 'purple', description: 'Async daily standups' },
    { id: 'decisions', name: 'Decision Log', icon: Lightbulb, color: 'orange', description: 'Track decisions and context' },
  ];

  const renderTool = (toolId: string) => {
    switch (toolId) {
      case 'notes':
        return <MeetingNotesTool />;
      case 'calendar':
        return <CalendarTool />;
      case 'standup':
        return <StandupBotTool />;
      case 'decisions':
        return <DecisionLogTool />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string }> = {
      blue: { gradient: 'from-blue-500 to-blue-600' },
      green: { gradient: 'from-green-500 to-green-600' },
      purple: { gradient: 'from-purple-500 to-purple-600' },
      orange: { gradient: 'from-orange-500 to-orange-600' },
    };
    return colors[color] || colors.blue;
  };

  if (activeToolId) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <button
            onClick={() => {
              setActiveToolId(null);
              window.history.pushState({}, '', `/workspace/${workspaceId}/meetings`);
            }}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            ← Back to Meeting Tools
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderTool(activeToolId)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Meeting & Communication</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Tools to organize meetings, track standups, and document important decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colors = getColorClasses(tool.color);
            return (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-transparent hover:shadow-xl transition-all duration-300 text-left"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {tool.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  Open tool
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Meeting Notes Tool
// ============================================================================

// Use the API types
type MeetingNote = meetingNotesApi.MeetingNote;
type ActionItem = meetingNotesApi.ActionItem;

const MeetingNotesTool: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<number | null>(null);

  const templates = {
    blank: {
      name: 'Blank',
      agenda: [],
    },
    oneOnOne: {
      name: '1:1 Meeting',
      agenda: ['Updates from last meeting', 'Current priorities', 'Blockers and challenges', 'Career development', 'Feedback'],
    },
    teamStandup: {
      name: 'Team Standup',
      agenda: ['What we did yesterday', 'What we\'re doing today', 'Any blockers'],
    },
    planning: {
      name: 'Sprint Planning',
      agenda: ['Sprint goals', 'Story estimation', 'Capacity planning', 'Dependencies'],
    },
    retrospective: {
      name: 'Retrospective',
      agenda: ['What went well', 'What could be improved', 'Action items'],
    },
  };

  // Load notes from backend
  const loadNotes = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const fetchedNotes = await meetingNotesApi.getMeetingNotes(workspaceId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Failed to load meeting notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNewNote = () => {
    const template = templates[selectedTemplate as keyof typeof templates];
    // Create a temporary note for editing (not yet in DB)
    const newNote: Partial<MeetingNote> & { id: string } = {
      id: 'temp-' + Date.now().toString(),
      workspace_id: workspaceId!,
      title: 'New Meeting',
      date: new Date().toISOString(),
      attendees: [],
      agenda: template.agenda,
      notes: '',
      action_items: [],
      template: selectedTemplate,
      created_by: '', // Will be set by backend
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingNote(newNote as MeetingNote);
  };

  const saveNote = async () => {
    if (!editingNote || !workspaceId) return;
    setIsSaving(true);
    try {
      const isNew = editingNote.id.startsWith('temp-');

      if (isNew) {
        // Create new note
        const createData: meetingNotesApi.CreateMeetingNoteData = {
          title: editingNote.title,
          date: editingNote.date,
          attendees: editingNote.attendees,
          agenda: editingNote.agenda,
          notes: editingNote.notes,
          actionItems: editingNote.action_items,
          template: editingNote.template,
        };
        await meetingNotesApi.createMeetingNote(workspaceId, createData);
      } else {
        // Update existing note
        const updateData: meetingNotesApi.UpdateMeetingNoteData = {
          title: editingNote.title,
          date: editingNote.date,
          attendees: editingNote.attendees,
          agenda: editingNote.agenda,
          notes: editingNote.notes,
          actionItems: editingNote.action_items,
          template: editingNote.template,
        };
        await meetingNotesApi.updateMeetingNote(workspaceId, editingNote.id, updateData);
      }

      await loadNotes();
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to save meeting note:', error);
      alert('Failed to save meeting note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!workspaceId) return;
    if (!confirm('Are you sure you want to delete this meeting note?')) return;

    try {
      await meetingNotesApi.deleteMeetingNote(workspaceId, noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete meeting note:', error);
      alert('Failed to delete meeting note. Please try again.');
    }
  };

  const addActionItem = () => {
    if (!editingNote) return;
    const newItem: ActionItem = {
      id: Date.now().toString(),
      text: '',
      assignee: '',
      completed: false,
    };
    setEditingNote({
      ...editingNote,
      action_items: [...editingNote.action_items, newItem],
    });
  };

  const updateActionItem = (itemId: string, updates: Partial<ActionItem>) => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      action_items: editingNote.action_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
    triggerAutoSave();
  };

  const deleteActionItem = (itemId: string) => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      action_items: editingNote.action_items.filter(item => item.id !== itemId),
    });
    triggerAutoSave();
  };

  // Auto-save functionality
  const triggerAutoSave = useCallback(() => {
    if (!editingNote || !workspaceId) return;
    if (editingNote.id.startsWith('temp-')) return; // Don't auto-save new notes

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const updateData: meetingNotesApi.UpdateMeetingNoteData = {
          title: editingNote.title,
          date: editingNote.date,
          attendees: editingNote.attendees,
          agenda: editingNote.agenda,
          notes: editingNote.notes,
          actionItems: editingNote.action_items,
          template: editingNote.template,
        };
        await meetingNotesApi.updateMeetingNote(workspaceId, editingNote.id, updateData);
        console.log('Meeting note auto-saved');
      } catch (error) {
        console.error('Failed to auto-save meeting note:', error);
      }
    }, 2000); // 2 second delay
  }, [editingNote, workspaceId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (editingNote) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Meeting Notes</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingNote(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => {
                  setEditingNote({ ...editingNote, title: e.target.value });
                  triggerAutoSave();
                }}
                className="w-full text-3xl font-bold border-none focus:outline-none mb-4"
                placeholder="Meeting Title"
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={new Date(editingNote.date).toISOString().slice(0, 16)}
                    onChange={(e) => {
                      setEditingNote({ ...editingNote, date: new Date(e.target.value).toISOString() });
                      triggerAutoSave();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attendees (comma-separated)</label>
                  <input
                    type="text"
                    value={editingNote.attendees.join(', ')}
                    onChange={(e) => {
                      setEditingNote({ ...editingNote, attendees: e.target.value.split(',').map(a => a.trim()).filter(Boolean) });
                      triggerAutoSave();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="John, Jane, etc."
                  />
                </div>
              </div>

              {editingNote.agenda.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agenda</label>
                  <ul className="space-y-2">
                    {editingNote.agenda.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-blue-600">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editingNote.notes}
                  onChange={(e) => {
                    setEditingNote({ ...editingNote, notes: e.target.value });
                    triggerAutoSave();
                  }}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Meeting notes..."
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Action Items</h3>
                <button
                  onClick={addActionItem}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {editingNote.action_items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => updateActionItem(item.id, { completed: e.target.checked })}
                      className="mt-1 rounded"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateActionItem(item.id, { text: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Action item..."
                      />
                      <input
                        type="text"
                        value={item.assignee}
                        onChange={(e) => updateActionItem(item.id, { assignee: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Assignee..."
                      />
                    </div>
                    <button
                      onClick={() => deleteActionItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Meeting Notes</h2>
            <p className="text-gray-600 mt-1">Organize your meetings with templates</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(templates).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
            <button
              onClick={createNewNote}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Note
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Loading meeting notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No meeting notes yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{note.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(note.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {note.attendees.length} attendees
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-4 h-4" />
                        {note.action_items.length} action items
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {note.action_items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Action Items:</h4>
                    <ul className="space-y-1">
                      {note.action_items.slice(0, 3).map(item => (
                        <li key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                          <Check className={`w-4 h-4 ${item.completed ? 'text-green-500' : 'text-gray-300'}`} />
                          {item.text} {item.assignee && <span className="text-gray-400">({item.assignee})</span>}
                        </li>
                      ))}
                      {note.action_items.length > 3 && (
                        <li className="text-sm text-gray-400">+{note.action_items.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Calendar Tool
// ============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  attendees: string[];
  location: string;
  meetingLink: string;
  description: string;
}

const CalendarTool: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const createEvent = (date: Date) => {
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: '',
      date: date,
      startTime: '10:00',
      endTime: '11:00',
      attendees: [],
      location: '',
      meetingLink: '',
      description: '',
    };
    setEditingEvent(newEvent);
    setShowEventModal(true);
  };

  const saveEvent = () => {
    if (!editingEvent) return;

    const exists = events.find(e => e.id === editingEvent.id);
    if (exists) {
      setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e));
    } else {
      setEvents([...events, editingEvent]);
    }
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const getEventsForDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(e =>
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayEvents = getEventsForDate(day);
              const isToday = new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => createEvent(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`
                    aspect-square p-2 rounded-lg border-2 transition-all text-left
                    ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                  `}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs bg-blue-100 text-blue-700 px-1 rounded truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setShowEventModal(true);
                        }}
                      >
                        {event.title || 'Untitled'}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Modal */}
        {showEventModal && editingEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {editingEvent.id ? 'Edit Event' : 'New Event'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Event title"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={editingEvent.date.toISOString().split('T')[0]}
                      onChange={(e) => setEditingEvent({ ...editingEvent, date: new Date(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={editingEvent.startTime}
                      onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={editingEvent.endTime}
                      onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attendees (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={editingEvent.attendees.join(', ')}
                    onChange={(e) => setEditingEvent({ ...editingEvent, attendees: e.target.value.split(',').map(a => a.trim()).filter(Boolean) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="john@example.com, jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={editingEvent.location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Conference Room A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link</label>
                  <input
                    type="url"
                    value={editingEvent.meetingLink}
                    onChange={(e) => setEditingEvent({ ...editingEvent, meetingLink: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingEvent.description}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Event description..."
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveEvent}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Event
                </button>
                {events.find(e => e.id === editingEvent.id) && (
                  <button
                    onClick={() => {
                      deleteEvent(editingEvent.id);
                      setShowEventModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Standup Bot Tool
// ============================================================================

interface StandupResponse {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  yesterday: string;
  today: string;
  blockers: string;
}

const StandupBotTool: React.FC = () => {
  const [responses, setResponses] = useState<StandupResponse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    yesterday: '',
    today: '',
    blockers: '',
  });
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const submitStandup = () => {
    const newResponse: StandupResponse = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'You',
      date: new Date(),
      yesterday: formData.yesterday,
      today: formData.today,
      blockers: formData.blockers,
    };

    setResponses([newResponse, ...responses]);
    setFormData({ yesterday: '', today: '', blockers: '' });
    setShowForm(false);
  };

  const filteredResponses = responses.filter(r =>
    r.date.toISOString().split('T')[0] === filterDate
  );

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Daily Standup</h2>
            <p className="text-gray-600 mt-1">Async daily updates from the team</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Submit Standup
          </button>
        </div>

        {/* Standup Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Today's Standup</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you do yesterday?
                </label>
                <textarea
                  value={formData.yesterday}
                  onChange={(e) => setFormData({ ...formData, yesterday: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Completed feature X, reviewed PR..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are you doing today?
                </label>
                <textarea
                  value={formData.today}
                  onChange={(e) => setFormData({ ...formData, today: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Working on feature Y, attending meeting..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Any blockers?
                </label>
                <textarea
                  value={formData.blockers}
                  onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Waiting for API documentation..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={submitStandup}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Standup Responses */}
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No standups for this date. Be the first to submit!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map(response => (
              <div key={response.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {response.userName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{response.userName}</h3>
                    <p className="text-sm text-gray-500">
                      {response.date.toLocaleDateString()} at {response.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Yesterday</h4>
                    <p className="text-gray-600">{response.yesterday}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Today</h4>
                    <p className="text-gray-600">{response.today}</p>
                  </div>
                  {response.blockers && (
                    <div>
                      <h4 className="text-sm font-semibold text-red-700 mb-1">Blockers</h4>
                      <p className="text-red-600">{response.blockers}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Decision Log Tool
// ============================================================================

interface Decision {
  id: string;
  title: string;
  description: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  stakeholders: string[];
  date: Date;
  tags: string[];
  status: 'proposed' | 'decided' | 'implemented';
}

const DecisionLogTool: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const createNewDecision = () => {
    const newDecision: Decision = {
      id: Date.now().toString(),
      title: '',
      description: '',
      decision: '',
      rationale: '',
      alternatives: [],
      stakeholders: [],
      date: new Date(),
      tags: [],
      status: 'proposed',
    };
    setEditingDecision(newDecision);
  };

  const saveDecision = () => {
    if (!editingDecision) return;

    const exists = decisions.find(d => d.id === editingDecision.id);
    if (exists) {
      setDecisions(decisions.map(d => d.id === editingDecision.id ? editingDecision : d));
    } else {
      setDecisions([editingDecision, ...decisions]);
    }
    setEditingDecision(null);
  };

  const deleteDecision = (decisionId: string) => {
    setDecisions(decisions.filter(d => d.id !== decisionId));
  };

  const filteredDecisions = filterStatus === 'all'
    ? decisions
    : decisions.filter(d => d.status === filterStatus);

  const statusColors = {
    proposed: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    decided: 'bg-blue-100 text-blue-700 border-blue-300',
    implemented: 'bg-green-100 text-green-700 border-green-300',
  };

  if (editingDecision) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Decision Log</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingDecision(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveDecision}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <input
                type="text"
                value={editingDecision.title}
                onChange={(e) => setEditingDecision({ ...editingDecision, title: e.target.value })}
                className="w-full text-3xl font-bold border-none focus:outline-none mb-4"
                placeholder="Decision Title"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editingDecision.status}
                  onChange={(e) => setEditingDecision({ ...editingDecision, status: e.target.value as Decision['status'] })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="proposed">Proposed</option>
                  <option value="decided">Decided</option>
                  <option value="implemented">Implemented</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingDecision.description}
                  onChange={(e) => setEditingDecision({ ...editingDecision, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="What needs to be decided?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <textarea
                  value={editingDecision.decision}
                  onChange={(e) => setEditingDecision({ ...editingDecision, decision: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="What was decided?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rationale</label>
                <textarea
                  value={editingDecision.rationale}
                  onChange={(e) => setEditingDecision({ ...editingDecision, rationale: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Why was this decision made?"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternatives Considered (one per line)
                </label>
                <textarea
                  value={editingDecision.alternatives.join('\n')}
                  onChange={(e) => setEditingDecision({ ...editingDecision, alternatives: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Alternative 1&#10;Alternative 2"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stakeholders (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingDecision.stakeholders.join(', ')}
                  onChange={(e) => setEditingDecision({ ...editingDecision, stakeholders: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="John, Jane, Engineering Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingDecision.tags.join(', ')}
                  onChange={(e) => setEditingDecision({ ...editingDecision, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="architecture, backend, api"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Decision Log</h2>
            <p className="text-gray-600 mt-1">Track important decisions and their context</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="proposed">Proposed</option>
              <option value="decided">Decided</option>
              <option value="implemented">Implemented</option>
            </select>
            <button
              onClick={createNewDecision}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Decision
            </button>
          </div>
        </div>

        {filteredDecisions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No decisions logged yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDecisions.map(decision => (
              <div key={decision.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{decision.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[decision.status]}`}>
                        {decision.status ? decision.status.charAt(0).toUpperCase() + decision.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{decision.description}</p>
                    {decision.decision && (
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-2">
                        <p className="text-sm font-medium text-orange-900">{decision.decision}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {decision.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingDecision(decision)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteDecision(decision.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  {decision.date.toLocaleDateString()} • {decision.stakeholders.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPage;
