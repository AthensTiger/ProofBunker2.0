import { useState } from 'react';
import {
  useAdminTickets,
  useUpdateTicketStatus,
  useTicketQuestions,
  useAskQuestion,
} from '../../hooks/useSupport';
import { useCurrentUser } from '../../hooks/useUser';
import { useUIStore } from '../../stores/uiStore';
import type { SupportTicket, TicketQuestion } from '../../types/support';

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  enhancement: 'Enhancement',
  question: 'Question',
  other: 'Other',
};

const TYPE_STYLES: Record<string, string> = {
  bug: 'bg-red-100 text-red-800',
  enhancement: 'bg-blue-100 text-blue-800',
  question: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function QAHistory({ questions }: { questions: TicketQuestion[] }) {
  if (questions.length === 0) return null;
  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <div key={q.id} className="border border-amber-200 rounded-lg p-3 space-y-1.5 bg-white">
          <div>
            <p className="text-xs font-semibold text-amber-800">
              Question · {formatDateTime(q.question_sent_at)}
              <span className="ml-2 font-normal text-gray-400">by {q.admin_email}</span>
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{q.question}</p>
          </div>
          {q.response ? (
            <div className="border-t border-amber-100 pt-1.5">
              <p className="text-xs font-semibold text-green-700">
                User response · {formatDateTime(q.response_received_at!)}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{q.response}</p>
            </div>
          ) : (
            <p className="text-xs text-orange-600 font-medium">Awaiting user response</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TicketCard({ ticket, canEdit }: { ticket: SupportTicket; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(ticket.status);
  const [questionText, setQuestionText] = useState('');
  const [showAskForm, setShowAskForm] = useState(false);
  const updateMutation = useUpdateTicketStatus();
  const askMutation = useAskQuestion();
  const addToast = useUIStore((s) => s.addToast);

  const { data: questions = [] } = useTicketQuestions(expanded ? ticket.id : null);

  const handleAskQuestion = () => {
    if (!questionText.trim()) return;
    askMutation.mutate(
      { id: ticket.id, question: questionText.trim() },
      {
        onSuccess: () => {
          addToast('success', 'Question sent to user');
          setQuestionText('');
          setShowAskForm(false);
        },
        onError: () => addToast('error', 'Failed to send question'),
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Collapsed header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4"
      >
        {/* Row 1: badges + date + chevron */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {ticket.ticket_type && (
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_STYLES[ticket.ticket_type] ?? 'bg-gray-100 text-gray-700'}`}>
                {TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}
              </span>
            )}
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            {ticket.attachments && ticket.attachments.length > 0 && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {ticket.attachments.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Row 2: user email */}
        <p className="text-xs text-gray-400 mb-0.5">{ticket.user_email}</p>

        {/* Row 3: title */}
        <p className="text-sm font-medium text-gray-900 leading-snug">{ticket.title}</p>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4 bg-amber-50">

          {/* Status selector (admin only) */}
          {canEdit && (
            <div onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</p>
              <select
                value={localStatus}
                disabled={updateMutation.isPending}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setLocalStatus(newStatus);
                  updateMutation.mutate(
                    { id: ticket.id, status: newStatus },
                    {
                      onSuccess: () => addToast('success', 'Status updated'),
                      onError: (err: unknown) => {
                        setLocalStatus(ticket.status);
                        const msg = err instanceof Error ? err.message : 'Failed to update status';
                        addToast('error', msg);
                      },
                    }
                  );
                }}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:opacity-60"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          {/* User description */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">User Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Attachments ({ticket.attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.cdn_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-400 transition-colors"
                    title={att.filename}
                  >
                    <img
                      src={att.cdn_url}
                      alt={att.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                      <p className="w-full text-center text-white text-xs p-1 opacity-0 group-hover:opacity-100 bg-black/50 truncate">
                        {att.filename} {formatBytes(att.file_size) ? `· ${formatBytes(att.file_size)}` : ''}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI analysis */}
          {ticket.claude_analysis && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase mb-1">AI Analysis</p>
              <p className="text-sm text-gray-800">{ticket.claude_analysis}</p>
            </div>
          )}

          {/* Suggested fix */}
          {ticket.claude_suggested_fix && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Suggested Fix / Implementation</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.claude_suggested_fix}</p>
            </div>
          )}

          {/* Q&A section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Q&A {questions.length > 0 ? `(${questions.length})` : ''}
              </p>
              {canEdit && !showAskForm && (
                <button
                  type="button"
                  onClick={() => setShowAskForm(true)}
                  className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                >
                  + Ask user a question
                </button>
              )}
            </div>

            <QAHistory questions={questions} />

            {/* Ask question form */}
            {showAskForm && canEdit && (
              <div className="mt-2 space-y-2 border border-amber-200 rounded-lg p-3 bg-white">
                <p className="text-xs font-semibold text-gray-600">New question to user</p>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  placeholder="Ask the user for clarification or more information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAskForm(false); setQuestionText(''); }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAskQuestion}
                    disabled={!questionText.trim() || askMutation.isPending}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50"
                  >
                    {askMutation.isPending ? 'Sending…' : 'Send Question'}
                  </button>
                </div>
              </div>
            )}

            {questions.length === 0 && !showAskForm && (
              <p className="text-xs text-gray-400">No questions yet.</p>
            )}
          </div>

          {/* Lifecycle timestamps */}
          {(ticket.resolved_at || ticket.auto_close_at || ticket.reopened_at) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {ticket.resolved_at && (
                <span className="text-xs text-gray-400">
                  Resolved: {new Date(ticket.resolved_at).toLocaleDateString()}
                </span>
              )}
              {ticket.auto_close_at && (
                <span className="text-xs text-amber-600">
                  Auto-closes: {new Date(ticket.auto_close_at).toLocaleDateString()}
                </span>
              )}
              {ticket.reopened_at && (
                <span className="text-xs text-gray-400">
                  Reopened: {new Date(ticket.reopened_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupportTicketsTab() {
  const { data: tickets = [], isLoading } = useAdminTickets();
  const { data: currentUser } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const canEdit = currentUser?.role === 'admin';

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  open: 1,
  resolved: 2,
  closed: 3,
};

  const filtered = (statusFilter === 'all' ? tickets : tickets.filter((t) => t.status === statusFilter))
    .slice()
    .sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400">No tickets found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
