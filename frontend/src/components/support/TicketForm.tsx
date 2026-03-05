import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useCreateTicket,
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

// ── Q&A item — shows one admin question + user response form ──────────────────
function QAItem({ question, ticketId }: { question: TicketQuestion; ticketId: number }) {
  const [responseText, setResponseText] = useState('');
  const respondMutation = useRespondToQuestion();
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    respondMutation.mutate(
      { id: ticketId, qid: question.id, response: responseText.trim() },
      {
        onSuccess: () => {
          addToast('success', 'Response sent');
          setResponseText('');
        },
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

// ── Single ticket card ────────────────────────────────────────────────────────
function TicketCard({ ticket, initialExpanded }: { ticket: SupportTicket; initialExpanded: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenNote, setReopenNote] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const reopenMutation = useReopenTicket();
  const addToast = useUIStore((s) => s.addToast);

  const { data: questions = [] } = useTicketQuestions(expanded ? ticket.id : null);

  // Scroll into view when auto-expanded from URL
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
        onSuccess: () => {
          addToast('success', 'Ticket reopened');
          setShowReopen(false);
          setReopenNote('');
        },
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
          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Your description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachments */}
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
                    <img
                      src={att.cdn_url}
                      alt={att.filename}
                      className="w-full h-full object-cover"
                    />
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

          {/* AI analysis */}
          {ticket.claude_analysis && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">AI Analysis</p>
              <p className="text-sm text-gray-700">{ticket.claude_analysis}</p>
            </div>
          )}

          {/* Q&A section */}
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

          {/* Reopen action — only for resolved tickets */}
          {ticket.status === 'resolved' && (
            <div className="pt-1">
              {!showReopen ? (
                <button
                  onClick={() => setShowReopen(true)}
                  className="text-sm font-medium text-amber-700 hover:text-amber-800"
                >
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

// ── Main form ─────────────────────────────────────────────────────────────────
export default function TicketForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState<SupportTicket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateTicket();
  const { data: myTickets = [] } = useMyTickets();
  const [searchParams] = useSearchParams();
  const autoExpandId = searchParams.get('ticket') ? Number(searchParams.get('ticket')) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => {
      const combined = [...prev, ...files];
      return combined.slice(0, 5); // max 5
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    attachments.forEach((file) => formData.append('attachments', file));
    createMutation.mutate(formData, {
      onSuccess: (ticket) => {
        setSubmitted(ticket);
        setTitle('');
        setDescription('');
        setAttachments([]);
      },
    });
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

          {/* File attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshots / Attachments{' '}
              <span className="text-gray-400 font-normal">(optional, up to 5 images)</span>
            </label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            {attachments.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach image{attachments.length > 0 ? ` (${attachments.length}/5)` : ''}
              </button>
            )}
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
            {myTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                initialExpanded={autoExpandId === t.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
