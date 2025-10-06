import clsx from 'clsx';

interface PresenceIndicatorProps {
  status: 'online' | 'away' | 'busy' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PresenceIndicator({ status, size = 'md', className }: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusClasses = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-white',
        sizeClasses[size],
        status ? statusClasses[status] : statusClasses.offline,
        className
      )}
      title={status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    />
  );
}