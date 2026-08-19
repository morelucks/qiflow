import QiFlowPaymentRouterABI from './QiFlowPaymentRouter.json' with { type: 'json' };
import QiFlowEscrowABI from './QiFlowEscrow.json' with { type: 'json' };

export const DEPLOYED_CONTRACTS = {
  CYPRUS1: {
    PAYMENT_ROUTER: '0x00692Af62465C89a121BD63eCc7f4B1B69b85334',
    ESCROW: '0x0033e5Af0120595D4d9263EA0fd3a2aa36fEF07a',
    RPC_URL: 'https://orchard.rpc.quai.network/cyprus1',
    CHAIN_ID: 15000,
  },
} as const;

export { QiFlowPaymentRouterABI, QiFlowEscrowABI };
