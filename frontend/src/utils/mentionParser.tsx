export interface MentionData {
  userId: string;
  username: string;
  position: number;
}

/**
 * Extract mentions from message content
 * Returns array of mentioned usernames
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Render message content with highlighted mentions
 */
export function renderMentions(content: string): JSX.Element[] {
  const mentionRegex = /@(\w+)/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>{content.substring(lastIndex, match.index)}</span>
      );
    }

    // Add mention with styling
    parts.push(
      <span
        key={`mention-${key++}`}
        className="mention bg-primary-100 text-primary-700 font-semibold px-1 rounded hover:bg-primary-200 cursor-pointer"
        data-username={match[1]}
      >
        @{match[1]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last mention
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key="text-0">{content}</span>];
}