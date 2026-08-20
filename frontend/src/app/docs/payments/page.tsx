import Link from 'next/link';
import { DocsPage, H2, H3, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Endpoint } from '@/components/docs/Endpoint';
import { ParamTable } from '@/components/docs/ParamTable';
import { Callout } from '@/components/docs/Callout';
import { Badge } from '@/components/ui/Badge';
import { API_BASE, APP_BASE } from '@/lib/docs';

const createCurl = `curl -X POST ${API_BASE}/v1/payments \\
  -H "X-API-Key: qiflow_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 12, "currency": "QI", "description": "Invoice 2026-081", "metadata": { "orderId": "8492" } }'`;

const paymentObject = `{
  "id": "6f0b4a3e-2d6c-4c0f-9d7a-1a2b3c4d5e6f",
  "paymentCode": "pay_4c1f28ccdc2cf482803fcf19",
  "amount": "12.00000000",
  "currency": "QI",
  "description": "Invoice 2026-081",
  "status": "CREATED",
  "receivingAddress": "0x00a1b2c3…",
  "txHash": null,
  "checkoutUrl": "${APP_BASE}/pay/pay_4c1f28ccdc2cf482803fcf19",
  "expiresAt": "2026-08-20T17:31:00.000Z",
  "completedAt": null,
  "createdAt": "2026-08-20T17:16:00.000Z"
}`;

const listCurl = `curl "${API_BASE}/v1/payments?status=COMPLETED&page=1&limit=50" \\
  -H "X-API-Key: qiflow_live_YOUR_KEY"`;

const listResponse = `{
  "success": true,
  "data": [ { "id": "…", "paymentCode": "pay_…", "status": "COMPLETED", "txHash": "0x…", "completedAt": "…", … } ],
  "pagination": { "page": 1, "limit": 50, "total": 132, "totalPages": 3 }
}`;

const getCurl = `# by id or by paymentCode
curl ${API_BASE}/v1/payments/pay_4c1f28ccdc2cf482803fcf19 \\
  -H "X-API-Key: qiflow_live_YOUR_KEY"`;

export default function PaymentsPage() {
  return (
    <DocsPage
      href="/docs/payments"
      title="Payments"
      lede="A payment is a one-time request for a fixed amount. Creating one gives you a hosted checkout URL; the payment then moves through a small set of statuses as the customer pays and the transaction confirms on Quai Network."
    >
      <section className="space-y-4">
        <H2 id="create">Create a payment</H2>
        <Endpoint method="POST" path="/v1/payments" id="post-payments">
          <ParamTable
            caption="Request body"
            params={[
              { name: 'amount', type: 'number', required: true, description: 'Amount in whole units (e.g. 12.5). Up to 8 decimal places.' },
              { name: 'currency', type: '"QI" | "QUAI"', description: <>Defaults to <code className="font-mono text-white">QI</code>. Must match your receiving wallet&apos;s ledger (see below).</> },
              { name: 'description', type: 'string', description: 'Up to 255 characters. Shown to the customer on checkout.' },
              { name: 'metadata', type: 'object', description: 'Any JSON you want stored with the payment (order id, customer ref).' },
            ]}
          />
          <CodeBlock title="Example" code={createCurl} lang="bash" />
        </Endpoint>
        <Callout kind="warning" title="Two preconditions">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Your receiving wallet must be set, otherwise <code>400 WALLET_NOT_SET</code>.
            </li>
            <li>
              <code>currency</code> must match the wallet&apos;s ledger (Qi address → QI, Quai address → QUAI), otherwise <code>400 WALLET_LEDGER_MISMATCH</code>.
            </li>
          </ul>
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="object">The payment object</H2>
        <CodeBlock title="data" code={paymentObject} lang="json" />
        <ParamTable
          caption="Payment fields"
          params={[
            { name: 'id', type: 'uuid', description: 'Stable identifier. Use it for idempotency on your side.' },
            { name: 'paymentCode', type: 'string', description: <>Public, URL-safe code (<code className="font-mono text-white">pay_…</code>). Appears in the checkout URL and webhooks.</> },
            { name: 'amount', type: 'string', description: 'Decimal string with 8 places — parse with a decimal library, not float, for accounting.' },
            { name: 'status', type: 'enum', description: 'See lifecycle below.' },
            { name: 'receivingAddress', type: 'string', description: 'Your wallet address the customer pays to (snapshotted at creation).' },
            { name: 'txHash', type: 'string | null', description: 'On-chain transaction hash once the customer has paid.' },
            { name: 'checkoutUrl', type: 'string', description: 'Hosted checkout page for this payment.' },
            { name: 'expiresAt', type: 'ISO date', description: '15 minutes after creation. Unpaid payments become EXPIRED.' },
            { name: 'completedAt', type: 'ISO date | null', description: 'Set when the payment is confirmed.' },
          ]}
        />
      </section>

      <section className="space-y-4">
        <H2 id="lifecycle">Status lifecycle</H2>
        <div className="not-prose overflow-x-auto rounded-xl border border-violet/20">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-violet/15 bg-ink/40">
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Meaning</th>
                <th className="px-4 py-2.5 font-medium">Final?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet/15 text-slate-300">
              {[
                ['CREATED', 'Checkout link issued; waiting for the customer.', 'No'],
                ['PROCESSING', 'A transaction hash was submitted; QiFlow is verifying it on-chain (destination, amount, receipt, confirmations).', 'No'],
                ['COMPLETED', 'Verified on-chain. Funds are in your wallet. payment.completed webhook sent.', 'Yes'],
                ['FAILED', 'The submitted transaction reverted, paid the wrong address, or underpaid. payment.failed webhook sent.', 'Yes'],
                ['EXPIRED', 'No payment before expiresAt.', 'Yes'],
                ['CANCELLED', 'Cancelled by the merchant.', 'Yes'],
              ].map(([s, m, f]) => (
                <tr key={s}>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Badge status={s!} /></td>
                  <td className="px-4 py-2.5">{m}</td>
                  <td className="px-4 py-2.5">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          Only <strong className="text-white">COMPLETED</strong> means you have been paid. Fulfil orders from the <code>payment.completed</code> webhook (or by polling{' '}
          <code>GET /v1/payments/:id</code>), never from the customer returning to your site.
        </P>
      </section>

      <section className="space-y-4">
        <H2 id="list">List payments</H2>
        <Endpoint method="GET" path="/v1/payments?status=&page=&limit=" id="get-payments">
          <ParamTable
            caption="Query parameters"
            params={[
              { name: 'status', type: 'enum', description: 'Filter by a single status.' },
              { name: 'page', type: 'number', description: 'Default 1.' },
              { name: 'limit', type: 'number', description: 'Default 20, max 100.' },
            ]}
          />
          <CodeBlock title="Example" code={listCurl} lang="bash" />
          <CodeBlock title="200 OK" code={listResponse} lang="json" />
        </Endpoint>
      </section>

      <section className="space-y-4">
        <H2 id="get">Get a payment</H2>
        <Endpoint method="GET" path="/v1/payments/:idOrCode" id="get-payment">
          <P>Accepts either the <code>id</code> or the <code>paymentCode</code>. Returns the payment object.</P>
          <CodeBlock title="Example" code={getCurl} lang="bash" />
        </Endpoint>
        <H3>Looking for the customer-facing endpoints?</H3>
        <P>
          The checkout page uses public, unauthenticated endpoints to show and confirm a payment — documented in <Link href="/docs/checkout">Hosted checkout</Link>.
        </P>
      </section>
    </DocsPage>
  );
}
