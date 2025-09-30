import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  PlayIcon,
  BackwardIcon,
  ForwardIcon,
} from '@heroicons/react/24/outline';

interface ChessBoardProps {
  initialPgn?: string;
  initialFen?: string;
  readOnly?: boolean;
  showControls?: boolean;
  onMove?: (move: string) => void;
  onGameEnd?: (result: 'white' | 'black' | 'draw') => void;
}

export default function ChessBoard({
  initialPgn,
  initialFen,
  readOnly = false,
  showControls = true,
  onMove,
  onGameEnd,
}: ChessBoardProps) {
  const [game, setGame] = useState<Chess>(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const engineRef = useRef<Worker | null>(null);

  // Initialize game from PGN or FEN
  useEffect(() => {
    const newGame = new Chess();

    if (initialPgn) {
      try {
        newGame.loadPgn(initialPgn);
        setGame(newGame);
        const history = newGame.history();
        setMoveHistory(history);
        setCurrentMoveIndex(history.length - 1);
      } catch (error) {
        console.error('Invalid PGN:', error);
      }
    } else if (initialFen) {
      try {
        newGame.load(initialFen);
        setGame(newGame);
      } catch (error) {
        console.error('Invalid FEN:', error);
      }
    }
  }, [initialPgn, initialFen]);

  // Initialize Stockfish engine
  useEffect(() => {
    if (analysisMode && !engineRef.current) {
      try {
        // Initialize Stockfish worker (using lila-stockfish-web)
        // Note: This is a placeholder - actual implementation would need proper Stockfish integration
        console.log('Chess analysis mode enabled - Stockfish integration would be initialized here');
        // For now, we'll skip the actual Stockfish integration due to package complexity
        // In production, you would use: import('lila-stockfish-web').then(...)
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
      }
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.terminate();
        engineRef.current = null;
      }
    };
  }, [analysisMode]);

  // Analyze current position
  useEffect(() => {
    if (analysisMode && engineRef.current) {
      try {
        engineRef.current.postMessage(`position fen ${game.fen()}`);
        engineRef.current.postMessage('go depth 15');
      } catch (error) {
        console.error('Analysis error:', error);
      }
    }
  }, [game, analysisMode]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (readOnly) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move === null) return false;

      setGame(new Chess(game.fen()));
      const newHistory = game.history();
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);

      if (onMove) {
        onMove(move.san);
      }

      // Check for game end
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          const winner = game.turn() === 'w' ? 'black' : 'white';
          onGameEnd?.(winner);
        } else {
          onGameEnd?.('draw');
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setEvaluation(null);
  };

  const goToMove = (index: number) => {
    if (index < 0 || index >= moveHistory.length) return;

    const newGame = new Chess();
    for (let i = 0; i <= index; i++) {
      newGame.move(moveHistory[i]);
    }
    setGame(newGame);
    setCurrentMoveIndex(index);
  };

  const previousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const nextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const exportPgn = () => {
    const pgn = game.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPgn = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pgn';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const pgn = event.target?.result as string;
          try {
            const newGame = new Chess();
            newGame.loadPgn(pgn);
            setGame(newGame);
            const history = newGame.history();
            setMoveHistory(history);
            setCurrentMoveIndex(history.length - 1);
          } catch (error) {
            console.error('Invalid PGN file:', error);
            alert('Invalid PGN file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={400}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        />

        {evaluation !== null && analysisMode && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
            <div className="text-xs font-semibold">Evaluation</div>
            <div className="text-lg">{evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}</div>
          </div>
        )}
      </div>

      {showControls && (
        <div className="flex flex-col space-y-3">
          {/* Playback controls */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => goToMove(-1)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              title="Go to start"
            >
              <BackwardIcon className="w-5 h-5" />
            </button>
            <button
              onClick={previousMove}
              disabled={currentMoveIndex <= 0}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
              title="Previous move"
            >
              <BackwardIcon className="w-4 h-4" />
            </button>
            <button
              onClick={nextMove}
              disabled={currentMoveIndex >= moveHistory.length - 1}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
              title="Next move"
            >
              <ForwardIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToMove(moveHistory.length - 1)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              title="Go to end"
            >
              <ForwardIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={importPgn}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>Import PGN</span>
            </button>
            <button
              onClick={exportPgn}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export PGN</span>
            </button>
            <button
              onClick={resetGame}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setAnalysisMode(!analysisMode)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-white text-sm ${
                analysisMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <PlayIcon className="w-4 h-4" />
              <span>{analysisMode ? 'Stop Analysis' : 'Analyze'}</span>
            </button>
          </div>

          {/* Move history */}
          {moveHistory.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Move History
              </div>
              <div className="flex flex-wrap gap-1">
                {moveHistory.map((move, index) => (
                  <button
                    key={index}
                    onClick={() => goToMove(index)}
                    className={`px-2 py-1 text-xs rounded ${
                      index === currentMoveIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Game status */}
          {game.isGameOver() && (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 rounded-lg p-3 text-center">
              <div className="font-semibold">
                {game.isCheckmate() ? `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!` :
                 game.isDraw() ? 'Draw!' :
                 game.isStalemate() ? 'Stalemate!' :
                 game.isThreefoldRepetition() ? 'Draw by repetition' :
                 game.isInsufficientMaterial() ? 'Draw by insufficient material' :
                 'Game Over'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}