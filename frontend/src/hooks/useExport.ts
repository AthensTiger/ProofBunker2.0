import { useState } from 'react';
import { useApiClient } from '../api/client';

export function useExportExcel() {
  const api = useApiClient();
  const [isPending, setIsPending] = useState(false);

  const exportExcel = async (filters?: Record<string, unknown>) => {
    setIsPending(true);
    try {
      await api.downloadBlob('/export/excel', filters || {}, 'bunker-export.xlsx');
    } finally {
      setIsPending(false);
    }
  };

  return { exportExcel, isPending };
}

export function useExportPdf() {
  const api = useApiClient();
  const [isPending, setIsPending] = useState(false);

  const exportPdf = async (filters?: Record<string, unknown>) => {
    setIsPending(true);
    try {
      await api.downloadBlob('/export/pdf', filters || {}, 'bunker-export.pdf');
    } finally {
      setIsPending(false);
    }
  };

  return { exportPdf, isPending };
}
