import React, { useState, useEffect } from 'react';
import { Project } from '../../services/projectService';
import taskService, { Task } from '../../services/taskService';
import toast from 'react-hot-toast';

interface ProjectTimelineViewProps {
  project: Project;
  onUpdate: () => void;
}

const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({ project }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewStart, setViewStart] = useState<Date>(new Date());
  const [viewEnd, setViewEnd] = useState<Date>(() => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return end;
  });

  useEffect(() => {
    loadTasks();
  }, [project]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getTasksByProject(project.id);
      // Filter tasks that have dates
      const tasksWithDates = data.filter(t => t.start_date || t.due_date);
      setTasks(tasksWithDates);

      // Adjust view range based on task dates
      if (tasksWithDates.length > 0) {
        const dates = tasksWithDates.flatMap(t => [
          t.start_date ? new Date(t.start_date) : null,
          t.due_date ? new Date(t.due_date) : null,
        ]).filter(Boolean) as Date[];

        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

          // Add some padding
          minDate.setDate(minDate.getDate() - 7);
          maxDate.setDate(maxDate.getDate() + 7);

          setViewStart(minDate);
          setViewEnd(maxDate);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getDaysBetween = (start: Date, end: Date): number => {
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const totalDays = getDaysBetween(viewStart, viewEnd);
  const dayWidth = 40; // pixels per day

  const getTaskPosition = (task: Task): { left: number; width: number } => {
    const taskStart = task.start_date ? new Date(task.start_date) : task.due_date ? new Date(task.due_date) : viewStart;
    const taskEnd = task.due_date ? new Date(task.due_date) : task.start_date ? new Date(task.start_date) : viewEnd;

    const daysFromStart = getDaysBetween(viewStart, taskStart);
    const taskDuration = Math.max(1, getDaysBetween(taskStart, taskEnd));

    return {
      left: Math.max(0, daysFromStart * dayWidth),
      width: taskDuration * dayWidth,
    };
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const generateMonthHeaders = (): { month: string; days: number; offset: number }[] => {
    const headers: { month: string; days: number; offset: number }[] = [];
    let currentDate = new Date(viewStart);
    let dayOffset = 0;

    while (currentDate <= viewEnd) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const endDate = monthEnd > viewEnd ? viewEnd : monthEnd;
      const days = getDaysBetween(currentDate, endDate) + 1;

      headers.push({
        month: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        days,
        offset: dayOffset,
      });

      dayOffset += days;
      currentDate = new Date(monthEnd);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return headers;
  };

  const monthHeaders = generateMonthHeaders();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks with dates</h3>
        <p className="text-gray-600">Add start or due dates to tasks to see them in the timeline</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="min-w-max">
        {/* Timeline Header */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200">
          {/* Month Headers */}
          <div className="flex border-b border-gray-200">
            <div className="w-64 flex-shrink-0 bg-gray-50"></div>
            <div className="flex">
              {monthHeaders.map((header, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 font-semibold text-sm text-gray-700 border-l border-gray-200"
                  style={{ width: header.days * dayWidth }}
                >
                  {header.month}
                </div>
              ))}
            </div>
          </div>

          {/* Day Headers */}
          <div className="flex">
            <div className="w-64 flex-shrink-0 bg-gray-50 px-4 py-2 font-medium text-sm text-gray-700">
              Task Name
            </div>
            <div className="flex">
              {Array.from({ length: totalDays }).map((_, idx) => {
                const date = new Date(viewStart);
                date.setDate(date.getDate() + idx);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={idx}
                    className={`px-2 py-2 text-xs text-center border-l border-gray-200 ${
                      isToday ? 'bg-blue-50 font-bold text-blue-700' : isWeekend ? 'bg-gray-50 text-gray-500' : 'text-gray-600'
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div>
          {tasks.map((task, idx) => {
            const { left, width } = getTaskPosition(task);
            const isCompleted = !!task.completed_at;

            return (
              <div
                key={task.id}
                className={`flex border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {/* Task Name Column */}
                <div className="w-64 flex-shrink-0 px-4 py-3 text-sm">
                  <div className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {task.title}
                  </div>
                  {task.assigned_user_name && (
                    <div className="text-xs text-gray-500 mt-1">{task.assigned_user_name}</div>
                  )}
                </div>

                {/* Timeline Column */}
                <div className="relative flex-1" style={{ height: '60px' }}>
                  {/* Background Grid */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: totalDays }).map((_, idx) => {
                      const date = new Date(viewStart);
                      date.setDate(date.getDate() + idx);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                        <div
                          key={idx}
                          className={`border-l border-gray-200 ${
                            isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : ''
                          }`}
                          style={{ width: dayWidth }}
                        />
                      );
                    })}
                  </div>

                  {/* Task Bar */}
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                    }}
                  >
                    <div
                      className={`h-8 rounded-lg shadow-sm flex items-center px-3 text-xs font-medium text-white ${
                        isCompleted
                          ? 'bg-gray-400'
                          : task.priority === 'urgent'
                          ? 'bg-red-500'
                          : task.priority === 'high'
                          ? 'bg-orange-500'
                          : task.priority === 'medium'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      }`}
                      title={`${task.start_date ? formatDate(new Date(task.start_date)) : ''} - ${task.due_date ? formatDate(new Date(task.due_date)) : ''}`}
                    >
                      <span className="truncate">{width > 100 ? task.title : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Today Indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 pointer-events-none"
          style={{
            left: `${264 + getDaysBetween(viewStart, new Date()) * dayWidth}px`,
          }}
        >
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimelineView;
