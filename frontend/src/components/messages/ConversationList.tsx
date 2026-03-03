import type { Conversation } from '../../types/messages';

interface Props {
  conversations: Conversation[];
  selectedId: number | null;
  currentUserId: number;
  onSelect: (id: number) => void;
}

export default function ConversationList({ conversations, selectedId, currentUserId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">
        No conversations yet.
        <br />
        Start one by messaging a contact.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const isMine = conv.last_message_sender_id === currentUserId;

        return (
          <li key={conv.id}>
            <button
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-amber-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {conv.other_user_avatar ? (
                  <img
                    src={conv.other_user_avatar}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm">
                    {(conv.other_user_name || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{conv.other_user_name}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {conv.last_message_content
                    ? `${isMine ? 'You: ' : ''}${conv.last_message_content}`
                    : 'No messages yet'}
                </p>
              </div>

              {/* Unread badge */}
              {conv.unread_count > 0 && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-700 text-white text-xs flex items-center justify-center font-medium">
                  {conv.unread_count > 9 ? '9+' : conv.unread_count}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
