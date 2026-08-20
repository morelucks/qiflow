import Link from 'next/link';
import { DocsPage, H2, P, Steps, Step } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Callout } from '@/components/docs/Callout';
import { API_BASE, APP_BASE } from '@/lib/docs';

const createCurl = `curl -X POST ${API_BASE}/v1/payments \\
  -H "X-API-Key: qiflow_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 25.5,
    "currency": "QI",
    "description": "Order #8492"
  }'`;

const createNode = `const res = await fetch('${API_BASE}/v1/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.QIFLOW_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 25.5,
    currency: 'QI',
    description: 'Order #8492',
  }),
});
const { data: payment } = await res.json();
// Send the customer here:
console.log(payment.checkoutUrl);`;

const createResponse = `{
  "success": true,
  "data": {
    "id": "6f0b4a3e-…",
    "paymentCode": "pay_4c1f28ccdc2cf482803fcf19",
    "amount": "25.50000000",
    "currency": "QI",
    "description": "Order #8492",
    "status": "CREATED",
    "receivingAddress": "0x00a1…b2c3",
    "checkoutUrl": "${APP_BASE}/pay/pay_4c1f28ccdc2cf482803fcf19",
    "expiresAt": "2026-08-20T17:31:00.000Z",
    "createdAt": "2026-08-20T17:16:00.000Z"
  }
}`;

const verifyNode = `import crypto from 'node:crypto';
import express from 'express';

const app = express();

// Use the RAW body — never re-serialize JSON before verifying.
app.post('/webhooks/qiflow', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('X-QiFlow-Signature') ?? '';   // "sha256=<hex>"
  const timestamp = Number(req.header('X-QiFlow-Timestamp'));  // unix seconds

  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.QIFLOW_WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  const fresh = Math.abs(Date.now() / 1000 - timestamp) <= 300;
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!fresh || !valid) return res.status(401).end();

  const { event, payment } = JSON.parse(req.body.toString());
  if (event === 'payment.completed') {
    // fulfil the order for payment.paymentCode (idempotently)
  }
  res.status(200).end(); // any 2xx = delivered
});`;

export default function QuickstartPage() {
  return (
    <DocsPage
      href="/docs"
      title="Quickstart"
      lede={
        <>
          QiFlow lets you accept <strong className="text-white">Qi</strong> and <strong className="text-white">QUAI</strong> on Quai Network with a
          hosted checkout page. Create a payment from your server, send the customer to the checkout link, and get a signed webhook when it
          confirms on-chain. Five steps, about ten minutes.
        </>
      }
    >
      <Callout kind="info" title="Base URL">
        All API requests go to <code>{API_BASE}</code>. Responses are JSON wrapped as <code>{'{ success, data }'}</code>; errors as{' '}
        <code>{'{ success:false, error:{ code, message } }'}</code>. See <Link href="/docs/errors" className="text-mint underline underline-offset-4">Errors &amp; limits</Link>.
      </Callout>

      <section>
        <H2 id="steps">Steps</H2>
        <div className="mt-6">
          <Steps>
            <Step title="Set your receiving wallet">
              <P>
                Payments are sent <em>directly</em> to your wallet — QiFlow never holds funds. In the dashboard go to{' '}
                <Link href="/dashboard/settings">Settings → Receiving wallet</Link> and paste your Quai Network address.
              </P>
              <Callout kind="warning" title="Qi vs QUAI addresses">
                Quai encodes the ledger in the address: a <strong>Qi</strong> address can only receive <strong>QI</strong>, a <strong>Quai</strong> address only{' '}
                <strong>QUAI</strong>. The dashboard detects which one you pasted; the API rejects payments in the other currency with{' '}
                <code>WALLET_LEDGER_MISMATCH</code>.
              </Callout>
            </Step>

            <Step title="Create an API key">
              <P>
                In <Link href="/dashboard/settings">Settings → API keys</Link>, click <strong>Generate key</strong>. The secret (format{' '}
                <code>qiflow_live_…</code>) is shown once — store it in your server&apos;s environment, never in a browser or mobile app. Send it as the{' '}
                <code>X-API-Key</code> header. See <Link href="/docs/authentication">Authentication</Link>.
              </P>
            </Step>

            <Step title="Create a payment from your server">
              <P>
                One request per thing you want to be paid for. You get back a <code>checkoutUrl</code> that is valid for 15 minutes.
              </P>
              <CodeBlock title="POST /v1/payments" tabs={[{ label: 'cURL', code: createCurl, lang: 'bash' }, { label: 'Node.js', code: createNode, lang: 'js' }]} />
              <CodeBlock title="201 Created" code={createResponse} lang="json" />
            </Step>

            <Step title="Send the customer to checkout">
              <P>
                Redirect (or link) to <code>data.checkoutUrl</code> — or keep the customer on your page with{' '}
                <Link href="/docs/inline">Inline checkout</Link> (a modal). The hosted page shows the amount, a QR code and the deposit address; QUAI payers can
                pay in one click with Pelagus, Qi payers send from their wallet and confirm with the transaction hash. The page updates itself while the
                transaction confirms. Details in <Link href="/docs/checkout">Hosted checkout</Link>.
              </P>
            </Step>

            <Step title="Get notified when it's paid">
              <P>
                Add an endpoint in <Link href="/dashboard/webhooks">Dashboard → Webhooks</Link> (or via the API) and copy its signing secret. You&apos;ll receive{' '}
                <code>payment.completed</code> / <code>payment.failed</code> events signed with HMAC-SHA256. Verify before you fulfil:
              </P>
              <CodeBlock title="Express — verify and handle" code={verifyNode} lang="js" />
              <P>
                Use the <strong>Send test</strong> button on the endpoint to receive a signed <code>webhook.test</code> event right away. Full reference in{' '}
                <Link href="/docs/webhooks">Webhooks</Link>.
              </P>
            </Step>
          </Steps>
        </div>
      </section>

      <section>
        <H2 id="next">What to read next</H2>
        <ul className="mt-4 grid sm:grid-cols-2 gap-3 not-prose">
          {[
            ['/docs/payments', 'Payments', 'Fields, statuses, listing and filtering.'],
            ['/docs/payment-links', 'Payment links', 'Reusable links — no server call per sale.'],
            ['/docs/webhooks', 'Webhooks', 'Events, headers, retries, verification.'],
            ['/docs/errors', 'Errors & limits', 'Every error code and the rate limits.'],
          ].map(([href, title, desc]) => (
            <li key={href}>
              <Link href={href!} className="block h-full rounded-2xl border border-violet/25 bg-indigo/40 p-4 hover:border-violet/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </DocsPage>
  );
}
