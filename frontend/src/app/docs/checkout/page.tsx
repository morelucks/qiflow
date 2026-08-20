import Link from 'next/link';
import { DocsPage, H2, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Endpoint } from '@/components/docs/Endpoint';
import { Callout } from '@/components/docs/Callout';
import { Badge } from '@/components/ui/Badge';
import { API_BASE, APP_BASE } from '@/lib/docs';

const pollCurl = `curl ${API_BASE}/v1/payments/public/code/pay_4c1f28ccdc2cf482803fcf19
# -> { "success": true, "data": { "status": "PROCESSING", "txHash": "0x…", "amount": "12.00000000", "currency": "QI", "receivingAddress": "0x…", "merchantName": "Acme", "expiresAt": "…" } }`;

const txCurl = `curl -X POST ${API_BASE}/v1/payments/public/code/pay_4c1f28ccdc2cf482803fcf19/tx \\
  -H "Content-Type: application/json" \\
  -d '{ "txHash": "0x<64 hex>", "payerAddress": "0x<40 hex>" }'
# 200 -> { "status": "PROCESSING", "txHash": "0x…" }
# 400 invalid hash · 409 ALREADY_COMPLETED / TX_ALREADY_SUBMITTED / PAYMENT_CLOSED · 410 PAYMENT_EXPIRED`;

export default function CheckoutPage() {
  return (
    <DocsPage
      href="/docs/checkout"
      title="Hosted checkout"
      lede={
        <>
          Every payment has a hosted checkout page at <code className="font-mono text-sm text-white">{APP_BASE}/pay/&lt;paymentCode&gt;</code>. It needs no credentials, works on mobile,
          and handles the wallet interaction and on-chain confirmation for you.
        </>
      }
    >
      <section className="space-y-4">
        <H2 id="flow">What the customer sees</H2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300">
          <li>Your business name, the description, and the amount due; a QR code and copyable deposit address (your receiving wallet).</li>
          <li>
            <strong className="text-white">QUAI payments:</strong> a <em>Pay with Pelagus</em> button. Pelagus (the Quai browser wallet) opens with the exact recipient and amount; the
            customer approves; the page submits the transaction hash automatically.
          </li>
          <li>
            <strong className="text-white">QI payments:</strong> Qi is UTXO-based and wallets don&apos;t expose a web API for it, so the page shows step-by-step instructions to send from the
            Pelagus Qi account and a field to paste the transaction hash. Customers using another wallet or scanning the QR do the same.
          </li>
          <li>
            The page polls every few seconds. Status goes <Badge status="PROCESSING" /> while QiFlow verifies the transaction, then <Badge status="COMPLETED" /> with the tx hash as a receipt.
          </li>
        </ol>
        <Callout kind="tip" title="Return to your site">
          Today the checkout page is terminal (no redirect back). Drive fulfilment from the <Link href="/docs/webhooks" className="text-mint underline underline-offset-4">webhook</Link> and show the customer
          a confirmation on your side when it arrives — or poll <code>GET /v1/payments/:id</code> from your server.
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="verification">How a payment is confirmed</H2>
        <P>
          When a hash is submitted the payment becomes <code>PROCESSING</code>. QiFlow looks the transaction up on the Quai RPC and marks the payment{' '}
          <code>COMPLETED</code> only when <strong className="text-white">all</strong> of these hold: the transaction is mined with a successful receipt; it pays your{' '}
          <code>receivingAddress</code>; for QUAI the value is at least the amount due; and it has the configured number of confirmations. A transaction that reverts, pays another
          address, or underpays marks the payment <code>FAILED</code>. Payments not paid before <code>expiresAt</code> become <code>EXPIRED</code>.
        </P>
      </section>

      <section className="space-y-4">
        <H2 id="endpoints">Public endpoints (if you build your own page)</H2>
        <P>Most merchants never call these — the hosted page does. They are unauthenticated and rate-limited per IP.</P>
        <Endpoint method="GET" path="/v1/payments/public/code/:paymentCode" auth="public" id="public-get">
          <P>Customer-safe view of a payment (no metadata). Polling this also lazily expires stale sessions and re-checks a submitted transaction.</P>
          <CodeBlock title="Example" code={pollCurl} lang="bash" />
        </Endpoint>
        <Endpoint method="POST" path="/v1/payments/public/code/:paymentCode/tx" auth="public" id="public-tx">
          <P>Report the customer&apos;s transaction hash for verification. Optional <code>payerAddress</code> is stored in the payment&apos;s metadata.</P>
          <CodeBlock title="Example" code={txCurl} lang="bash" />
        </Endpoint>
      </section>
    </DocsPage>
  );
}
