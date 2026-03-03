import { useState, useRef, useEffect } from 'react';
import { useChatHistory, useSendChatMessage, useClearChatHistory } from '../../hooks/useSupport';

interface ChatInterfaceProps {
  compact?: boolean; // true = floating panel mode (smaller height, no clear button in header)
}

export default function ChatInterface({ compact = false }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useChatHistory();
  const sendMutation = useSendChatMessage();
  const clearMutation = useClearChatHistory();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar (only in full-page mode) */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Ask anything about using Proof Bunker.</p>
          {messages.length > 0 && (
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear history
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto space-y-3 ${compact ? 'px-3 py-2' : 'pr-1'}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-2xl mb-2">💬</p>
            <p>Hi! How can I help you with Proof Bunker?</p>
            <p className="mt-1 text-xs">Ask about features, troubleshoot issues, or learn how things work.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-amber-700 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className={`flex gap-2 items-end ${compact ? 'px-3 pb-3 pt-2 border-t border-gray-100' : 'mt-3'}`}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... (Enter to send)"
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          disabled={sendMutation.isPending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sendMutation.isPending}
          className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}
