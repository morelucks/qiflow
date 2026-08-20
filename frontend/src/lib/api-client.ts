const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const LOGIN_PATH = '/auth/login';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message: string };
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

interface RequestOptions extends RequestInit {
  token?: string;
  /** Skip the automatic refresh-and-retry on 401 (used for auth endpoints themselves). */
  skipAuthRefresh?: boolean;
}

const isBrowser = () => typeof window !== 'undefined';

// ── Token storage ─────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  return isBrowser() ? localStorage.getItem(ACCESS_KEY) : null;
}
export function getRefreshToken(): string | null {
  return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null;
}
export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}
export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Seconds until the JWT expires (negative if already expired, null if unreadable). */
export function getTokenSecondsRemaining(token: string | null = getAccessToken()): number | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.exp !== 'number') return null;
    return json.exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

export function redirectToLogin(reason: 'expired' | 'unauthenticated' = 'unauthenticated'): void {
  if (!isBrowser()) return;
  clearTokens();
  if (window.location.pathname.startsWith('/auth/')) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${LOGIN_PATH}?reason=${reason}&next=${next}`;
}

export function logout(): void {
  clearTokens();
  if (isBrowser()) window.location.href = LOGIN_PATH;
}

// ── Refresh (single-flight) ───────────────────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new token pair. Concurrent callers share one request.
 * Returns true on success; on failure the session is cleared.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
      if (res.ok && json.success && json.data?.accessToken && json.data?.refreshToken) {
        setTokens(json.data);
        return true;
      }
      clearTokens();
      return false;
    } catch {
      // Network blip: keep tokens so the next attempt can retry
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ── Request helper ────────────────────────────────────────────────────────────
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { token: explicitToken, skipAuthRefresh, ...init } = options;
  const isAuthEndpoint = endpoint.startsWith('/auth/');

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string>),
    };
    return fetch(`${API_BASE}${endpoint}`, { ...init, headers });
  };

  try {
    let token = explicitToken || getAccessToken();

    // Proactively refresh if the access token is about to expire
    if (!explicitToken && !isAuthEndpoint && !skipAuthRefresh && token) {
      const remaining = getTokenSecondsRemaining(token);
      if (remaining !== null && remaining < 30) {
        if (await refreshSession()) token = getAccessToken();
      }
    }

    let res = await doFetch(token);

    // Reactive refresh: a 401 on a protected call means the access token died — refresh once and retry
    if (res.status === 401 && !explicitToken && !isAuthEndpoint && !skipAuthRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        res = await doFetch(getAccessToken());
      } else if (!getRefreshToken()) {
        redirectToLogin('expired');
      }
    }

    const data = (await res.json()) as ApiResponse<T>;
    return data;
  } catch (err) {
    return {
      success: false,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    };
  }
}
