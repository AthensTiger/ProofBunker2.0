import { useState } from 'react';
import ChatInterface from '../components/support/ChatInterface';
import TicketForm from '../components/support/TicketForm';
import { useClearChatHistory } from '../hooks/useSupport';

type Tab = 'chat' | 'ticket';

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>('chat');
  const clearMutation = useClearChatHistory();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        {tab === 'chat' && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear chat history
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {([['chat', 'Chat with Support'], ['ticket', 'Submit a Ticket']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'chat' && (
        <div className="bg-white rounded-lg shadow p-4 h-[560px] flex flex-col">
          <ChatInterface />
        </div>
      )}

      {tab === 'ticket' && <TicketForm />}
    </div>
  );
}
