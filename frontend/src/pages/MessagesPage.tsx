import { useState } from 'react';
import { useConversations, useContacts, useGetOrCreateConversation } from '../hooks/useMessages';
import { useCurrentUser } from '../hooks/useUser';
import ConversationList from '../components/messages/ConversationList';
import MessageThread from '../components/messages/MessageThread';
import type { Contact } from '../types/messages';

export default function MessagesPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: contacts = [] } = useContacts();
  const getOrCreate = useGetOrCreateConversation();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const selectedConv = conversations.find((c) => c.id === selectedConvId) ?? null;

  const handleStartConversation = (contact: Contact) => {
    getOrCreate.mutate(contact.id, {
      onSuccess: (data) => {
        setSelectedConvId(data.id);
        setShowNewMessage(false);
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        {contacts.length > 0 && (
          <button
            onClick={() => setShowNewMessage((v) => !v)}
            className="px-3 py-1.5 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
          >
            New Message
          </button>
        )}
      </div>

      {/* New message contact picker */}
      {showNewMessage && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Select a contact to message:</p>
          <div className="space-y-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleStartConversation(c)}
                disabled={getOrCreate.isPending}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm">
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-900">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <div className="flex h-full">
          {/* Left panel — conversation list */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversations</p>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700" />
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedConvId}
                currentUserId={currentUser?.id ?? 0}
                onSelect={setSelectedConvId}
              />
            )}
          </div>

          {/* Right panel — thread */}
          <div className="flex-1 overflow-hidden">
            {selectedConv && currentUser ? (
              <MessageThread
                conversation={selectedConv}
                currentUserId={currentUser.id}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm">
                  {conversations.length === 0 && contacts.length === 0
                    ? 'Share your bunker with someone to start messaging them.'
                    : conversations.length === 0
                    ? 'Click "New Message" to start a conversation.'
                    : 'Select a conversation to read messages.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
