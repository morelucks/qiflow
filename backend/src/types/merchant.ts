export interface AuthenticatedMerchant {
  id: string;
  email: string | null;
  businessName?: string;
  walletAddress?: string | null;
}

export type MerchantContext = AuthenticatedMerchant;
