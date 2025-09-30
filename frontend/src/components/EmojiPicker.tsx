import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { EmojiClickData } from 'emoji-picker-react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';

// Lazy load the emoji picker library (it's quite large)
const EmojiPickerReact = lazy(() => import('emoji-picker-react'));

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Add reaction"
      >
        <FaceSmileIcon className="w-4 h-4 text-gray-600" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-50 shadow-xl">
          <Suspense fallback={
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg" style={{ width: 350, height: 400 }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <EmojiPickerReact
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              width={350}
              height={400}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}