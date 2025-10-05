import React from 'react';
import { KnightIcon, QueenIcon, RookIcon, PawnIcon, KingIcon } from './ChessPieceIcons';

interface ChessEmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'board' | 'pieces';
}

/**
 * ChessEmptyState Component
 * Chess-themed empty state illustrations
 */
export const ChessEmptyState: React.FC<ChessEmptyStateProps> = ({
  title,
  description,
  action,
  variant = 'default',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {variant === 'board' && <ChessBoardIllustration />}
      {variant === 'pieces' && <ChessPiecesIllustration />}
      {variant === 'default' && <DefaultChessIllustration />}

      <h3 className="mt-6 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-600 max-w-md">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

/**
 * Chess Board Illustration
 */
const ChessBoardIllustration: React.FC = () => (
  <div className="relative">
    {/* Chess board */}
    <div className="grid grid-cols-8 gap-0 w-64 h-64 rounded-lg overflow-hidden shadow-xl border-4 border-gray-800">
      {Array.from({ length: 64 }).map((_, i) => (
        <div
          key={i}
          className={`
            ${(Math.floor(i / 8) + (i % 8)) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-800'}
            transition-all duration-300 hover:opacity-80
          `}
        />
      ))}
    </div>

    {/* Floating pieces */}
    <div className="absolute -top-4 -left-4 w-12 h-12 animate-bounce" style={{ animationDelay: '0ms' }}>
      <KnightIcon className="w-full h-full text-gray-800 drop-shadow-lg" />
    </div>
    <div className="absolute -top-4 -right-4 w-12 h-12 animate-bounce" style={{ animationDelay: '200ms' }}>
      <RookIcon className="w-full h-full text-gray-800 drop-shadow-lg" />
    </div>
    <div className="absolute -bottom-4 -left-4 w-12 h-12 animate-bounce" style={{ animationDelay: '400ms' }}>
      <PawnIcon className="w-full h-full text-gray-800 drop-shadow-lg" />
    </div>
    <div className="absolute -bottom-4 -right-4 w-12 h-12 animate-bounce" style={{ animationDelay: '600ms' }}>
      <QueenIcon className="w-full h-full text-gray-800 drop-shadow-lg" />
    </div>
  </div>
);

/**
 * Chess Pieces Illustration
 */
const ChessPiecesIllustration: React.FC = () => (
  <div className="flex items-end gap-3">
    <div className="animate-bounce" style={{ animationDelay: '0ms' }}>
      <PawnIcon className="w-12 h-12 text-gray-700" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '100ms' }}>
      <KnightIcon className="w-16 h-16 text-gray-800" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '200ms' }}>
      <RookIcon className="w-20 h-20 text-gray-900" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '300ms' }}>
      <QueenIcon className="w-24 h-24 text-gray-900" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '400ms' }}>
      <KingIcon className="w-20 h-20 text-gray-900" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '500ms' }}>
      <RookIcon className="w-16 h-16 text-gray-800" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '600ms' }}>
      <PawnIcon className="w-12 h-12 text-gray-700" />
    </div>
  </div>
);

/**
 * Default Chess Illustration (single knight)
 */
const DefaultChessIllustration: React.FC = () => (
  <div className="relative">
    {/* Checkered background circle */}
    <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 shadow-xl flex items-center justify-center">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full opacity-20">
        {Array.from({ length: 64 }).map((_, i) => (
          <div
            key={i}
            className={`${(Math.floor(i / 8) + (i % 8)) % 2 === 0 ? 'bg-gray-900' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>

    {/* Knight piece overlay */}
    <div className="absolute inset-0 flex items-center justify-center">
      <KnightIcon className="w-20 h-20 text-gray-900 drop-shadow-lg" />
    </div>
  </div>
);

/**
 * ChessLoadingState - Loading state with chess theme
 */
export const ChessLoadingState: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center p-12">
    <div className="relative w-24 h-24">
      {/* Rotating chess pieces */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <PawnIcon className="w-8 h-8 text-gray-600" />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <RookIcon className="w-8 h-8 text-gray-700" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <KnightIcon className="w-8 h-8 text-gray-800" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <QueenIcon className="w-8 h-8 text-gray-700" />
        </div>
      </div>

      {/* Center piece */}
      <div className="absolute inset-0 flex items-center justify-center">
        <KingIcon className="w-12 h-12 text-gray-900 animate-pulse" />
      </div>
    </div>
    <p className="mt-6 text-sm text-gray-600 font-medium">{text}</p>
  </div>
);

/**
 * ChessMiniLoader - Small inline loader
 */
export const ChessMiniLoader: React.FC = () => (
  <div className="inline-flex items-center gap-1">
    <div className="animate-bounce" style={{ animationDelay: '0ms' }}>
      <div className="w-2 h-3 bg-gray-800 rounded-sm" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '100ms' }}>
      <div className="w-2 h-4 bg-gray-700 rounded-sm" />
    </div>
    <div className="animate-bounce" style={{ animationDelay: '200ms' }}>
      <div className="w-2 h-3 bg-gray-800 rounded-sm" />
    </div>
  </div>
);

export default ChessEmptyState;
