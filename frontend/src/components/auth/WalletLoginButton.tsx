'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setTokens } from '@/lib/api-client';

interface WalletLoginButtonProps {
  businessName?: string;
  className?: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export function WalletLoginButton({ businessName, className = '' }: WalletLoginButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Web3 wallet detected. Please install WalletConnect, MetaMask, or a Quai-compatible wallet extension.');
      }

      // Step 1: Request account connection
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts selected.');
      }

      const address = accounts[0];

      // Step 2: Fetch nonce challenge from backend API
      const nonceRes = await apiClient<{
        address: string;
        nonce: string;
        message: string;
      }>(`/auth/wallet/nonce?address=${address}`);

      if (!nonceRes.success || !nonceRes.data?.message) {
        throw new Error(nonceRes.error?.message || 'Failed to generate wallet authentication challenge');
      }

      const messageToSign = nonceRes.data.message;

      // Step 3: Request signature from Web3 wallet
      const signature = (await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, address],
      })) as string;

      if (!signature) {
        throw new Error('Message signing was cancelled.');
      }

      // Step 4: Verify signature with backend API
      const verifyRes = await apiClient<{
        merchant: { id: string; email: string | null; businessName: string; walletAddress: string };
        tokens: { accessToken: string; refreshToken: string; expiresIn: number };
        isNewMerchant?: boolean;
      }>('/auth/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({
          address,
          message: messageToSign,
          signature,
          businessName,
        }),
      });

      if (verifyRes.success && verifyRes.data?.tokens) {
        setTokens(verifyRes.data.tokens);
        router.push('/dashboard');
      } else {
        throw new Error(verifyRes.error?.message || 'Wallet signature verification failed.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during wallet authentication.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {error && (
        <div className="mb-3 p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleWalletAuth}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-lg border border-slate-700/50 shadow-sm transition-all duration-150 text-sm disabled:opacity-50 group"
      >
        <svg className="w-5 h-5 fill-current text-sky-400 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
          <path d="M19 7h-1V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zm-14-2h10a1 1 0 0 1 1 1v1H5V6a1 1 0 0 1 1-1zm16 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9h16v9zm-4-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
        </svg>
        <span>{loading ? 'Connecting & Signing...' : 'Sign in with Web3 Wallet / WalletConnect'}</span>
      </button>
    </div>
  );
}
