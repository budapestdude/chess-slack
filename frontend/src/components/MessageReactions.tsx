import { Reaction } from '../types';

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}

export default function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasUserReacted: false,
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.userId);
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasUserReacted: boolean }>);

  const handleReactionClick = (emoji: string, hasUserReacted: boolean) => {
    if (hasUserReacted) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  };

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(groupedReactions).map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasUserReacted)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
            reaction.hasUserReacted
              ? 'bg-primary-100 border-primary-400 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
          }`}
          title={`${reaction.count} ${reaction.count === 1 ? 'person' : 'people'} reacted`}
        >
          <span className="text-base leading-none">{reaction.emoji}</span>
          <span className="text-xs font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}