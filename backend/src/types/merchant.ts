export interface AuthenticatedMerchant {
  id: string;
  email: string;
  businessName?: string;
  walletAddress?: string | null;
}

export type MerchantContext = AuthenticatedMerchant;
