import { useState } from 'react';
import { useAdminTickets, useUpdateTicketStatus } from '../../hooks/useSupport';
import { useCurrentUser } from '../../hooks/useUser';
import { useUIStore } from '../../stores/uiStore';
import type { SupportTicket } from '../../types/support';

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

function TicketCard({ ticket, canEdit }: { ticket: SupportTicket; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(ticket.status);
  const updateMutation = useUpdateTicketStatus();
  const addToast = useUIStore((s) => s.addToast);

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
