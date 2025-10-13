import { useState } from 'react';
import { TrophyIcon, UserGroupIcon, CalendarIcon, ChartBarIcon, ClipboardDocumentCheckIcon, MegaphoneIcon } from '@heroicons/react/24/outline';

interface TournamentDashboardProps {
  workspaceId: string;
}

export default function TournamentDashboard({ workspaceId }: TournamentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'participants' | 'schedule' | 'results' | 'announcements'>('overview');

  return (
    <div className="flex h-full bg-white">
      {/* Tournament Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrophyIcon className="w-5 h-5" />
            Tournament Manager
          </h2>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrophyIcon className="w-5 h-5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tournaments'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            Tournaments
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'participants'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            Participants
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            Schedule
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'results'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Results & Standings
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'announcements'
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MegaphoneIcon className="w-5 h-5" />
            Announcements
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium">
            New Tournament
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <TournamentOverview workspaceId={workspaceId} />}
        {activeTab === 'tournaments' && <TournamentsManagement workspaceId={workspaceId} />}
        {activeTab === 'participants' && <ParticipantsManagement workspaceId={workspaceId} />}
        {activeTab === 'schedule' && <ScheduleManagement workspaceId={workspaceId} />}
        {activeTab === 'results' && <ResultsAndStandings workspaceId={workspaceId} />}
        {activeTab === 'announcements' && <AnnouncementsManagement workspaceId={workspaceId} />}
      </div>
    </div>
  );
}

// Tournament Overview Component
function TournamentOverview({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tournament Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Active Tournaments</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Total Participants</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Upcoming Events</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-gray-900">0</div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Tournaments</h2>
          <div className="text-center py-12 text-gray-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No tournaments yet</p>
            <p className="text-sm">Create your first tournament to start organizing events</p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              New Tournament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tournaments Management Component
function TournamentsManagement({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            New Tournament
          </button>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button className="px-4 py-2 border-b-2 border-primary-600 text-primary-600 font-medium">
              Active
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              Upcoming
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              Completed
            </button>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="text-center py-12 text-gray-500">
            <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No active tournaments</p>
            <p className="text-sm">Create a tournament to manage events, participants, and schedules</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Participants Management Component
function ParticipantsManagement({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Import
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              Add Participant
            </button>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
          <input
            type="text"
            placeholder="Search participants..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="text-center py-12 text-gray-500">
            <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No participants registered</p>
            <p className="text-sm">Add participants to manage registrations and track participation</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule Management Component
function ScheduleManagement({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            Add Event
          </button>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No scheduled events</p>
            <p className="text-sm">Create events to organize rounds, meetings, and tournament activities</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Results and Standings Component
function ResultsAndStandings({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Results & Standings</h1>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            Submit Results
          </button>
        </div>

        <div className="mb-6">
          <select className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Select Tournament</option>
          </select>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Played
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  W/D/L
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No standings available</p>
                  <p className="text-sm mt-1">Results will appear here once games are completed</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Announcements Management Component
function AnnouncementsManagement({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            New Announcement
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="text-center py-12 text-gray-500">
              <MegaphoneIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No announcements yet</p>
              <p className="text-sm">Create announcements to keep participants informed about tournament updates</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Announcements will be automatically posted to the #announcements channel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
