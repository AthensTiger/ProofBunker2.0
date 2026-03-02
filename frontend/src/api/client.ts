import { createContext, useContext } from 'react';
import { ApiError } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiClient {
  private getToken: () => Promise<string>;

  constructor(getToken: () => Promise<string>) {
    this.getToken = getToken;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.reload();
        throw new ApiError(401, 'Session expired');
      }
      const body = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, body.error || 'Request failed');
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  del(path: string): Promise<void> {
    return this.request<void>(path, { method: 'DELETE' });
  }

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // No Content-Type — browser sets multipart/form-data with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(response.status, body.error || 'Upload failed');
    }

    return response.json();
  }

  async downloadBlob(path: string, body: unknown, filename: string): Promise<void> {
    const token = await this.getToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Export failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient must be used within ApiProvider');
  return client;
}
