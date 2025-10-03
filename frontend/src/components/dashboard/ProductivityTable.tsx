import { useState } from 'react';
import { ArrowUpDown, TrendingUp } from 'lucide-react';
import { UserProductivity } from '../../services/analytics';

interface ProductivityTableProps {
  users: UserProductivity[];
  loading?: boolean;
}

type SortField = 'userName' | 'messagesCount' | 'tasksCompleted' | 'documentsEdited' | 'eventsAttended' | 'totalActivity';
type SortDirection = 'asc' | 'desc';

export default function ProductivityTable({ users, loading = false }: ProductivityTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalActivity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    const aNum = Number(aValue) || 0;
    const bNum = Number(bValue) || 0;
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProgressColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Productivity</h3>
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No productivity data available</p>
        </div>
      </div>
    );
  }

  const maxValues = {
    messages: Math.max(...users.map((u) => u.messagesCount), 1),
    tasks: Math.max(...users.map((u) => u.tasksCompleted), 1),
    documents: Math.max(...users.map((u) => u.documentsEdited), 1),
    events: Math.max(...users.map((u) => u.eventsAttended), 1),
    total: Math.max(...users.map((u) => u.totalActivity), 1),
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 font-medium text-gray-700 hover:text-gray-900 transition-colors"
    >
      <span>{children}</span>
      <ArrowUpDown className="w-4 h-4" />
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Productivity</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4">
                <SortButton field="userName">User</SortButton>
              </th>
              <th className="text-left py-3 px-4">
                <SortButton field="messagesCount">Messages</SortButton>
              </th>
              <th className="text-left py-3 px-4">
                <SortButton field="tasksCompleted">Tasks</SortButton>
              </th>
              <th className="text-left py-3 px-4">
                <SortButton field="documentsEdited">Documents</SortButton>
              </th>
              <th className="text-left py-3 px-4">
                <SortButton field="eventsAttended">Events</SortButton>
              </th>
              <th className="text-left py-3 px-4">
                <SortButton field="totalActivity">Total Activity</SortButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.slice(0, 10).map((user, index) => (
              <tr
                key={user.userId}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* User Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    {user.userAvatar ? (
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(user.userName)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{user.userName}</p>
                      {index < 3 && (
                        <span className="text-xs text-yellow-600 font-semibold">Top Performer</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Messages Column */}
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{user.messagesCount}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getProgressColor(
                          user.messagesCount,
                          maxValues.messages
                        )}`}
                        style={{
                          width: `${(user.messagesCount / maxValues.messages) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Tasks Column */}
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{user.tasksCompleted}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getProgressColor(
                          user.tasksCompleted,
                          maxValues.tasks
                        )}`}
                        style={{
                          width: `${(user.tasksCompleted / maxValues.tasks) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Documents Column */}
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{user.documentsEdited}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getProgressColor(
                          user.documentsEdited,
                          maxValues.documents
                        )}`}
                        style={{
                          width: `${(user.documentsEdited / maxValues.documents) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Events Column */}
                <td className="py-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{user.eventsAttended}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getProgressColor(
                          user.eventsAttended,
                          maxValues.events
                        )}`}
                        style={{
                          width: `${(user.eventsAttended / maxValues.events) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>

                {/* Total Activity Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">{user.totalActivity}</span>
                    {index < 3 && <TrendingUp className="w-4 h-4 text-green-500" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length > 10 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Showing top 10 of {users.length} team members
        </p>
      )}
    </div>
  );
}
