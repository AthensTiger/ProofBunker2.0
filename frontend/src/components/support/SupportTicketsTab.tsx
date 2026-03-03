import { useState } from 'react';
import { useAdminTickets, useUpdateTicketStatus } from '../../hooks/useSupport';
import { useCurrentUser } from '../../hooks/useUser';
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

function TicketRow({ ticket, canEdit }: { ticket: SupportTicket; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const updateMutation = useUpdateTicketStatus();

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-sm text-gray-900">{ticket.user_email}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.title}</td>
        <td className="px-4 py-3">
          {ticket.ticket_type && (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_STYLES[ticket.ticket_type] ?? 'bg-gray-100 text-gray-700'}`}>
              {TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}
            </span>
          )}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {canEdit ? (
            <select
              value={ticket.status}
              onChange={(e) => updateMutation.mutate({ id: ticket.id, status: e.target.value })}
              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${STATUS_STYLES[ticket.status]}`}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          ) : (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
      </tr>
      {expanded && (
        <tr className="bg-amber-50">
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">User Description</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {ticket.claude_analysis && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">AI Analysis</p>
                  <p className="text-sm text-gray-800">{ticket.claude_analysis}</p>
                </div>
              )}
              {ticket.claude_suggested_fix && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Suggested Fix / Implementation</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.claude_suggested_fix}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function SupportTicketsTab() {
  const { data: tickets = [], isLoading } = useAdminTickets();
  const { data: currentUser } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const canEdit = currentUser?.role === 'admin';

  const filtered = statusFilter === 'all' ? tickets : tickets.filter((t) => t.status === statusFilter);

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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} canEdit={canEdit} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
