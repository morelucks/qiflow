const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<{ success: boolean; data?: T; error?: { message: string } }> {
  const token = options.token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      success: false,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    };
  }
}
