import { useState, lazy, Suspense } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// Lazy load the ChessBoard component (includes chess.js and react-chessboard)
const ChessBoard = lazy(() => import('./ChessBoard'));

interface ChessMessageProps {
  pgn?: string;
  fen?: string;
  description?: string;
  compact?: boolean;
}

export default function ChessMessage({ pgn, fen, description, compact = false }: ChessMessageProps) {
  const [expanded, setExpanded] = useState(!compact);

  if (compact && !expanded) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 my-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">♟️</div>
            <div>
              <div className="font-semibold text-sm">Chess Game</div>
              {description && (
                <div className="text-xs text-gray-600 dark:text-gray-400">{description}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded"
          >
            <ChevronDownIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 my-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">♟️</div>
          <div>
            <div className="font-semibold">Chess Game</div>
            {description && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
            )}
          </div>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded"
          >
            <ChevronUpIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        }>
          <ChessBoard
            initialPgn={pgn}
            initialFen={fen}
            readOnly={true}
            showControls={true}
          />
        </Suspense>
      </div>
    </div>
  );
}