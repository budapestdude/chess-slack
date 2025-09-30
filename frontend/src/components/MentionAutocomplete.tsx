import { useEffect, useRef, useState } from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: string;
}

interface MentionAutocompleteProps {
  users: User[];
  position: { top: number; left: number };
  onSelect: (user: User) => void;
  onClose: () => void;
  searchTerm: string;
}

export default function MentionAutocomplete({
  users,
  position,
  onSelect,
  onClose,
  searchTerm,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Reset selected index when filtered users change
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredUsers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelect(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    // Scroll selected item into view
    if (menuRef.current) {
      const selectedElement = menuRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredUsers.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-64 max-h-64 overflow-y-auto"
        style={{ top: position.top, left: position.left }}
      >
        <div className="px-4 py-2 text-sm text-gray-500">No users found</div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-64 max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {filteredUsers.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors ${
            index === selectedIndex ? 'bg-primary-100' : ''
          }`}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded" />
          ) : (
            <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {getInitials(user.displayName || user.username)}
            </div>
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{user.displayName}</span>
            <span className="text-xs text-gray-500">@{user.username}</span>
          </div>
        </button>
      ))}
    </div>
  );
}