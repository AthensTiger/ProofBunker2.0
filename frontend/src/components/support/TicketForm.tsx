import { useState, useRef } from 'react';
import { useCreateTicket } from '../../hooks/useSupport';
import type { SupportTicket } from '../../types/support';

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  enhancement: 'Enhancement Request',
  question: 'Question',
  other: 'Other',
};

export default function TicketForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState<SupportTicket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateTicket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5));
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
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
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
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
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
  );
}
