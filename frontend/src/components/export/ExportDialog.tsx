import { useExportExcel, useExportPdf } from '../../hooks/useExport';
import { useUIStore } from '../../stores/uiStore';
import Dialog from '../ui/Dialog';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { exportExcel, isPending: excelPending } = useExportExcel();
  const { exportPdf, isPending: pdfPending } = useExportPdf();

  const handleExcel = async () => {
    try {
      await exportExcel();
      addToast('success', 'Excel file downloaded');
      onClose();
    } catch {
      addToast('error', 'Export failed');
    }
  };

  const handlePdf = async () => {
    try {
      await exportPdf();
      addToast('success', 'PDF file downloaded');
      onClose();
    } catch {
      addToast('error', 'Export failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export Collection">
      <p className="text-sm text-gray-600 mb-6">Choose a format to export your entire bunker collection.</p>
      <div className="space-y-3">
        <button
          onClick={handleExcel}
          disabled={excelPending}
          className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span className="text-2xl">&#128196;</span>
          <div className="text-left">
            <p className="font-medium text-gray-900">Excel (.xlsx)</p>
            <p className="text-xs text-gray-500">Spreadsheet with all bottle details</p>
          </div>
        </button>
        <button
          onClick={handlePdf}
          disabled={pdfPending}
          className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <span className="text-2xl">&#128462;</span>
          <div className="text-left">
            <p className="font-medium text-gray-900">PDF</p>
            <p className="text-xs text-gray-500">Formatted document grouped by spirit type</p>
          </div>
        </button>
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
