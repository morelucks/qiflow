'use client';

import { logout } from '@/lib/api-client';

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={logout}
      className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
    >
      ↩ Log out
    </button>
  );
}
