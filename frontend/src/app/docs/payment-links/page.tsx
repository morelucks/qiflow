import Link from 'next/link';
import { DocsPage, H2, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Endpoint } from '@/components/docs/Endpoint';
import { ParamTable } from '@/components/docs/ParamTable';
import { Callout } from '@/components/docs/Callout';
import { API_BASE, APP_BASE } from '@/lib/docs';

const createCurl = `curl -X POST ${API_BASE}/v1/payment-links \\
  -H "X-API-Key: qiflow_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Coffee", "amount": 2.5, "currency": "QI", "description": "Thanks for the coffee ☕", "fixedAmount": true }'`;

const linkObject = `{
  "id": "0c9a…",
  "linkCode": "pl_611ace39",
  "name": "Coffee",
  "amount": "2.50000000",
  "currency": "QI",
  "description": "Thanks for the coffee ☕",
  "fixedAmount": true,
  "isActive": true,
  "uses": 0,
  "url": "${APP_BASE}/pay/link/pl_611ace39",
  "createdAt": "2026-08-20T17:16:00.000Z"
}`;

const updateCurl = `curl -X PUT ${API_BASE}/v1/payment-links/0c9a… \\
  -H "X-API-Key: qiflow_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "isActive": false }'`;

const publicCurl = `# what the hosted link page calls — no auth
curl ${API_BASE}/v1/payment-links/public/pl_611ace39

curl -X POST ${API_BASE}/v1/payment-links/public/pl_611ace39/checkout \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 5 }'      # only used when fixedAmount is false
# -> { "paymentCode": "pay_…", "paymentId": "…", "redirectUrl": "/pay/pay_…" }`;

export default function PaymentLinksPage() {
  return (
    <DocsPage
      href="/docs/payment-links"
      title="Payment links"
      lede="A payment link is a reusable URL you can put in a bio, an invoice or a QR code. Each visit creates a fresh payment (1-hour checkout) for that link, so you don't need a server call per sale."
    >
      <section className="space-y-4">
        <H2 id="create">Create a link</H2>
        <Endpoint method="POST" path="/v1/payment-links" id="post-links">
          <ParamTable
            caption="Request body"
            params={[
              { name: 'name', type: 'string', required: true, description: 'Up to 100 characters. Shown to the customer.' },
              { name: 'amount', type: 'number | string', description: <>Required when <code className="font-mono text-white">fixedAmount</code> is true.</> },
              { name: 'currency', type: '"QI" | "QUAI"', description: 'Defaults to QI. Must match your receiving wallet ledger when a customer checks out.' },
              { name: 'description', type: 'string', description: 'Up to 500 characters.' },
              { name: 'fixedAmount', type: 'boolean', description: <>Default true. When false, the customer enters the amount on the link page.</> },
              { name: 'isActive', type: 'boolean', description: 'Default true. Inactive links show as unavailable.' },
            ]}
          />
          <CodeBlock title="Example" code={createCurl} lang="bash" />
          <CodeBlock title="201 Created → data" code={linkObject} lang="json" />
        </Endpoint>
        <P>
          Share <code>data.url</code>. Payments created from a link carry the link&apos;s description and appear in <Link href="/docs/payments">Payments</Link> and webhooks like any other payment.
        </P>
      </section>

      <section className="space-y-4">
        <H2 id="manage">List, get, update, deactivate</H2>
        <Endpoint method="GET" path="/v1/payment-links?page=&limit=" id="get-links">
          <P>Returns your links (newest first) with <code>pagination</code>.</P>
        </Endpoint>
        <Endpoint method="GET" path="/v1/payment-links/:id" id="get-link">
          <P>Returns one link including <code>uses</code> (number of payments created from it).</P>
        </Endpoint>
        <Endpoint method="PUT" path="/v1/payment-links/:id" id="put-link">
          <P>Partial update — send only the fields you want to change. Set <code>amount</code> to <code>null</code> to clear it.</P>
          <CodeBlock title="Example — pause a link" code={updateCurl} lang="bash" />
        </Endpoint>
        <Endpoint method="DELETE" path="/v1/payment-links/:id" id="delete-link">
          <P>Deactivates the link (<code>isActive: false</code>). Existing payments are untouched; you can re-activate with PUT.</P>
        </Endpoint>
      </section>

      <section className="space-y-4">
        <H2 id="public">How a visit becomes a payment</H2>
        <P>
          The hosted link page (<code>{APP_BASE}/pay/link/:linkCode</code>) loads the link, asks for an amount if it isn&apos;t fixed, then creates a payment and redirects to the
          normal <Link href="/docs/checkout">checkout page</Link>. You only need these if you build your own link page:
        </P>
        <Endpoint method="GET" path="/v1/payment-links/public/:linkCode" auth="public" id="public-link">
          <P>Public link details (name, amount, currency, merchant name, <code>uses</code>). 400 <code>LINK_INACTIVE</code> if paused.</P>
        </Endpoint>
        <Endpoint method="POST" path="/v1/payment-links/public/:linkCode/checkout" auth="public" id="public-checkout">
          <P>Creates a payment for the link (60-minute expiry) and returns <code>paymentCode</code> + <code>redirectUrl</code>.</P>
          <CodeBlock title="Example" code={publicCurl} lang="bash" />
        </Endpoint>
        <Callout kind="info">
          Checkout from a link fails with <code>WALLET_NOT_SET</code> / <code>WALLET_LEDGER_MISMATCH</code> under the same rules as payments — set your wallet before sharing links.
        </Callout>
      </section>
    </DocsPage>
  );
}
