import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatInterface from '../components/support/ChatInterface';
import TicketForm from '../components/support/TicketForm';
import TicketList from '../components/support/TicketList';
import { useClearChatHistory, useMyTickets } from '../hooks/useSupport';

type Tab = 'chat' | 'ticket' | 'tickets';

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const autoExpandId = searchParams.get('ticket') ? Number(searchParams.get('ticket')) : null;
  const [tab, setTab] = useState<Tab>(autoExpandId ? 'tickets' : 'chat');
  const clearMutation = useClearChatHistory();
  const { data: myTickets = [] } = useMyTickets();

  // Badge: count of tickets needing attention (not closed)
  const activeCount = myTickets.filter((t) => t.status !== 'closed').length;

  const TABS: [Tab, string][] = [
    ['chat', 'Chat with Support'],
    ['ticket', 'Submit a Ticket'],
    ['tickets', 'Your Tickets'],
  ];

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
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {key === 'tickets' && activeCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                  {activeCount}
                </span>
              )}
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

      {tab === 'tickets' && <TicketList autoExpandId={autoExpandId} />}
    </div>
  );
}
