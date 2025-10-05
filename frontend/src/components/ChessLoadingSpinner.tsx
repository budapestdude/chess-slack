import React from 'react';

interface ChessLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * ChessLoadingSpinner Component
 * Animated chess piece loader with multiple animation styles
 */
const ChessLoadingSpinner: React.FC<ChessLoadingSpinnerProps> = ({
  size = 'md',
  text
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Bouncing Chess Pieces */}
        <div className="absolute inset-0 flex items-end justify-center gap-1">
          <div className="w-1/6 bg-gray-800 rounded-sm animate-bounce" style={{ animationDelay: '0ms', height: '60%' }}>
            <div className="w-full h-2 bg-gray-900 rounded-t-full" />
          </div>
          <div className="w-1/6 bg-gray-700 rounded-sm animate-bounce" style={{ animationDelay: '150ms', height: '80%' }}>
            <div className="w-full h-2 bg-gray-800 rounded-t-full" />
          </div>
          <div className="w-1/6 bg-gray-600 rounded-sm animate-bounce" style={{ animationDelay: '300ms', height: '100%' }}>
            <div className="w-full h-2 bg-gray-700 rounded-t-full" />
          </div>
          <div className="w-1/6 bg-gray-700 rounded-sm animate-bounce" style={{ animationDelay: '450ms', height: '80%' }}>
            <div className="w-full h-2 bg-gray-800 rounded-t-full" />
          </div>
          <div className="w-1/6 bg-gray-800 rounded-sm animate-bounce" style={{ animationDelay: '600ms', height: '60%' }}>
            <div className="w-full h-2 bg-gray-900 rounded-t-full" />
          </div>
        </div>
      </div>
      {text && (
        <p className="text-sm text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

/**
 * ChessSpinnerCircle Component
 * Rotating chess piece in a circle
 */
export const ChessSpinnerCircle: React.FC<ChessLoadingSpinnerProps> = ({
  size = 'md',
  text
}) => {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative" style={{ width: spinnerSize, height: spinnerSize }}>
        {/* Rotating border */}
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-gray-800 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />

        {/* Chess piece in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 text-gray-800">
            {/* Knight piece */}
            <path
              fill="currentColor"
              d="M19 22H5v-2h14v2m-2-2H7l1-6H6l2-4 4-1V7L9 5l1-1 4 .5V3h2v1l1 1v2l-2 2 1 1-1 2h2l-1.5 3H17v4z"
            />
          </svg>
        </div>
      </div>
      {text && (
        <p className="text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
};

/**
 * ChessDotsLoader Component
 * Chess-themed dot loader
 */
export const ChessDotsLoader: React.FC<ChessLoadingSpinnerProps> = ({
  size = 'md',
  text
}) => {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        {/* Chess board pattern dots */}
        <div className={`${dotSizes[size]} bg-gray-800 rounded-sm animate-pulse`} style={{ animationDelay: '0ms' }} />
        <div className={`${dotSizes[size]} bg-gray-400 rounded-sm animate-pulse`} style={{ animationDelay: '200ms' }} />
        <div className={`${dotSizes[size]} bg-gray-800 rounded-sm animate-pulse`} style={{ animationDelay: '400ms' }} />
        <div className={`${dotSizes[size]} bg-gray-400 rounded-sm animate-pulse`} style={{ animationDelay: '600ms' }} />
        <div className={`${dotSizes[size]} bg-gray-800 rounded-sm animate-pulse`} style={{ animationDelay: '800ms' }} />
      </div>
      {text && (
        <p className="text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
};

/**
 * ChessBoardLoader Component
 * Animated chess board pattern
 */
export const ChessBoardLoader: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="grid grid-cols-4 gap-0.5 w-16 h-16">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`
              ${(Math.floor(i / 4) + (i % 4)) % 2 === 0 ? 'bg-gray-800' : 'bg-gray-400'}
              animate-pulse
            `}
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
      {text && (
        <p className="text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
};

export default ChessLoadingSpinner;
