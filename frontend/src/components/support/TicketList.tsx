import { useState, useRef, useEffect } from 'react';
import {
  useMyTickets,
  useReopenTicket,
  useTicketQuestions,
  useRespondToQuestion,
} from '../../hooks/useSupport';
import { useUIStore } from '../../stores/uiStore';
import type { SupportTicket, TicketQuestion } from '../../types/support';

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

// In Progress → Resolved → Open → Closed, then newest first within each group
const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  resolved: 1,
  open: 2,
  closed: 3,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function autoCloseCountdown(autoCloseAt: string): string {
  const diff = new Date(autoCloseAt).getTime() - Date.now();
  if (diff <= 0) return 'closing soon';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `Auto-closes in ${days} day${days !== 1 ? 's' : ''}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function QAItem({ question, ticketId }: { question: TicketQuestion; ticketId: number }) {
  const [responseText, setResponseText] = useState('');
  const respondMutation = useRespondToQuestion();
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    respondMutation.mutate(
      { id: ticketId, qid: question.id, response: responseText.trim() },
      {
        onSuccess: () => { addToast('success', 'Response sent'); setResponseText(''); },
        onError: () => addToast('error', 'Failed to send response'),
      }
    );
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-xs font-semibold text-amber-800 mb-1">Question from support team</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{question.question}</p>
        <p className="text-xs text-gray-400 mt-1">{formatDateTime(question.question_sent_at)}</p>
      </div>
      {question.response ? (
        <div className="border-t border-amber-200 pt-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">Your response</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.response}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDateTime(question.response_received_at!)}</p>
        </div>
      ) : (
        <div className="border-t border-amber-200 pt-2 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Your response</p>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={3}
            placeholder="Type your reply here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!responseText.trim() || respondMutation.isPending}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50"
            >
              {respondMutation.isPending ? 'Sending…' : 'Send Response'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, initialExpanded }: { ticket: SupportTicket; initialExpanded: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const reopenMutation = useReopenTicket();
  const addToast = useUIStore((s) => s.addToast);

  const { data: questions = [] } = useTicketQuestions(expanded ? ticket.id : null);

  useEffect(() => {
    if (initialExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialExpanded]);

  const handleReopen = () => {
    if (!reopenNote.trim()) return;
    reopenMutation.mutate(
      { id: ticket.id, note: reopenNote.trim() },
      {
        onSuccess: () => { addToast('success', 'Ticket reopened'); setShowReopen(false); setReopenNote(''); },
        onError: () => addToast('error', 'Failed to reopen ticket'),
      }
    );
  };

  return (
    <div ref={cardRef} className="border border-gray-200 rounded-lg p-4">
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
            {ticket.status === 'resolved' && ticket.auto_close_at && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                {autoCloseCountdown(ticket.auto_close_at)}
              </span>
            )}
            {questions.some((q) => !q.response) && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                Response needed
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(ticket.created_at)}</span>
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

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Attachments ({ticket.attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.cdn_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition-colors"
                    title={att.filename}
                  >
                    <img src={att.cdn_url} alt={att.filename} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                      <p className="w-full text-center text-white text-xs p-1 opacity-0 group-hover:opacity-100 bg-black/50 truncate">
                        {formatBytes(att.file_size)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {ticket.claude_analysis && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">AI Analysis</p>
              <p className="text-sm text-gray-700">{ticket.claude_analysis}</p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Questions from support ({questions.length})
              </p>
              {questions.map((q) => (
                <QAItem key={q.id} question={q} ticketId={ticket.id} />
              ))}
            </div>
          )}

          {ticket.reopened_at && (
            <p className="text-xs text-gray-400">Previously reopened: {formatDate(ticket.reopened_at)}</p>
          )}

          {ticket.status === 'resolved' && (
            <div className="pt-1">
              {!showReopen ? (
                <button onClick={() => setShowReopen(true)} className="text-sm font-medium text-amber-700 hover:text-amber-800">
                  Still need help? Reopen this ticket →
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Why are you reopening this ticket?</p>
                  <textarea
                    value={reopenNote}
                    onChange={(e) => setReopenNote(e.target.value)}
                    rows={3}
                    placeholder="Describe what still needs to be resolved..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowReopen(false); setReopenNote(''); }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReopen}
                      disabled={!reopenNote.trim() || reopenMutation.isPending}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50"
                    >
                      {reopenMutation.isPending ? 'Reopening…' : 'Reopen Ticket'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TicketList({ autoExpandId }: { autoExpandId: number | null }) {
  const { data: myTickets = [], isLoading } = useMyTickets();

  const sorted = myTickets.slice().sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    // Newest first within each group
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-400 text-sm">You haven't submitted any tickets yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((t) => (
        <TicketCard key={t.id} ticket={t} initialExpanded={autoExpandId === t.id} />
      ))}
    </div>
  );
}
