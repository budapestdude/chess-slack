import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: LucideIcon;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientTo,
  loading = false,
}: StatCardProps) {
  const changeColor = change !== undefined ? (change >= 0 ? 'text-green-600' : 'text-red-600') : '';
  const changePrefix = change !== undefined && change > 0 ? '+' : '';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>

          {change !== undefined && (
            <div className={`flex items-center text-sm font-semibold ${changeColor}`}>
              <span>
                {changePrefix}
                {change}%
              </span>
              {change >= 0 ? (
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
