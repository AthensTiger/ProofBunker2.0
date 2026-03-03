import { useState } from 'react';
import { useCreateTicket, useMyTickets } from '../../hooks/useSupport';
import type { SupportTicket } from '../../types/support';

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  enhancement: 'Enhancement Request',
  question: 'Question',
  other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {ticket.ticket_type && (
              <span className="text-xs text-gray-500">{TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}</span>
            )}
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-amber-700 hover:text-amber-800 shrink-0"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Your description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.claude_analysis && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">AI Analysis</p>
              <p className="text-sm text-gray-700">{ticket.claude_analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TicketForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState<SupportTicket | null>(null);
  const createMutation = useCreateTicket();
  const { data: myTickets = [] } = useMyTickets();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: (ticket) => {
          setSubmitted(ticket);
          setTitle('');
          setDescription('');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Submit a Support Ticket</h2>
        <p className="text-sm text-gray-500 mb-4">
          Describe a bug or request a new feature. Our AI will analyze your submission and a human admin will review it.
        </p>

        {submitted && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-1">Ticket submitted!</p>
            {submitted.ticket_type && (
              <p className="text-sm text-green-700">
                Classified as: <strong>{TYPE_LABELS[submitted.ticket_type] ?? submitted.ticket_type}</strong>
              </p>
            )}
            {submitted.claude_analysis && (
              <p className="text-sm text-green-700 mt-1">{submitted.claude_analysis}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue or request"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible. For bugs: what happened, what you expected, steps to reproduce. For features: what you want and why."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!title.trim() || !description.trim() || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>

      {/* Ticket history */}
      {myTickets.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Your Tickets</h3>
          <div className="space-y-3">
            {myTickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
