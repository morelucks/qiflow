'use client';

import { useEffect, useState } from 'react';
import { SkeletonPage } from '@/components/ui/Skeleton';
import {
  getAccessToken,
  getRefreshToken,
  getTokenSecondsRemaining,
  redirectToLogin,
  refreshSession,
} from '@/lib/api-client';

/** Refresh this many seconds before the access token expires. */
const REFRESH_LEAD_SECONDS = 60;
/** How often to re-check while the tab is open. */
const CHECK_INTERVAL_MS = 20_000;

/**
 * Client-side session keeper for the dashboard.
 * - Redirects to /auth/login when there is no session.
 * - Keeps the session alive while the dashboard is open by refreshing the
 *   access token before it expires (and immediately when the tab regains focus).
 * - Bounces to login (with ?reason=expired) once the refresh token itself is dead.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      const access = getAccessToken();
      const refresh = getRefreshToken();
      if (!access && !refresh) {
        redirectToLogin('unauthenticated');
        return false;
      }
      const remaining = getTokenSecondsRemaining(access);
      if (remaining === null || remaining < REFRESH_LEAD_SECONDS) {
        const ok = await refreshSession();
        if (!ok && !getRefreshToken()) {
          redirectToLogin('expired');
          return false;
        }
        if (!ok && (getTokenSecondsRemaining(getAccessToken()) ?? -1) <= 0) {
          // Refresh failed (e.g. offline) and the access token is already dead
          redirectToLogin('expired');
          return false;
        }
      }
      return true;
    };

    ensureSession().then((ok) => {
      if (!cancelled && ok) setReady(true);
    });

    const interval = setInterval(ensureSession, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ensureSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  if (!ready) {
    return <SkeletonPage />;
  }

  return <>{children}</>;
}
