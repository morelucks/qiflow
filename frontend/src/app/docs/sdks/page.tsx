import Link from 'next/link';
import { DocsPage, H2, H3, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Callout } from '@/components/docs/Callout';
import { API_BASE } from '@/lib/docs';

const nodeInstall = `npm install @qiflow/sdk`;
const nodeUsage = `import { QiFlow } from '@qiflow/sdk';

const qiflow = new QiFlow({
  apiKey: process.env.QIFLOW_API_KEY,   // qiflow_live_…
  // baseUrl: '${API_BASE}',             // defaults to https://api.qiflow.io
});

// Payments
const payment = await qiflow.payments.create({ amount: 12.5, currency: 'QI', description: 'Order #8492', metadata: { orderId: '8492' } });
const again   = await qiflow.payments.retrieve(payment.paymentCode);
const { data, pagination } = await qiflow.payments.list({ status: 'COMPLETED', limit: 50 });

// Payment links
const link = await qiflow.paymentLinks.create({ name: 'Coffee', amount: 2.5, currency: 'QI' });
await qiflow.paymentLinks.update(link.id, { isActive: false });

// Webhook endpoints
const wh = await qiflow.webhookEndpoints.create({ url: 'https://example.com/webhooks/qiflow' });
console.log(wh.secret); // store it — shown once
await qiflow.webhookEndpoints.test(wh.id);`;

const nodeWebhook = `import express from 'express';
import { QiFlow, QiFlowError } from '@qiflow/sdk';

app.post('/webhooks/qiflow', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const event = QiFlow.webhooks.constructEvent({
      rawBody: req.body,                                   // Buffer — raw bytes
      secret: process.env.QIFLOW_WEBHOOK_SECRET,           // whsec_…
      signature: req.header('X-QiFlow-Signature'),
      timestamp: req.header('X-QiFlow-Timestamp'),         // enforces the 5-minute window
    });
    if (event.event === 'payment.completed') fulfil(event.payment.paymentCode, event.payment.txHash);
    res.sendStatus(200);
  } catch (err) {
    if (err instanceof QiFlowError) return res.sendStatus(401);
    res.sendStatus(500);
  }
});`;

const nodeErrors = `import { QiFlowError } from '@qiflow/sdk';
try {
  await qiflow.payments.create({ amount: 5, currency: 'QUAI' });
} catch (err) {
  if (err instanceof QiFlowError) {
    err.status;  // 400
    err.code;    // 'WALLET_LEDGER_MISMATCH'
    err.message; // human-readable
    err.details; // field errors for VALIDATION_ERROR
  }
}`;

const reactInstall = `npm install @qiflow/react`;
const reactUsage = `'use client';
import { QiFlowButton, useQiFlowInline } from '@qiflow/react';

export function PayButton({ paymentCode }: { paymentCode: string }) {
  return (
    <QiFlowButton
      paymentCode={paymentCode}
      onSuccess={(p) => (window.location.href = \`/thanks?ref=\${p.paymentCode}\`)}
      className="btn"
    >
      Pay now
    </QiFlowButton>
  );
}

// or imperative, client-only:
export function TipJar() {
  const { open, ready } = useQiFlowInline();
  return (
    <button disabled={!ready} onClick={() => open({ key: 'qiflow_pk_live_…', amount: 1, currency: 'QI', reference: crypto.randomUUID() })}>
      Tip 1 QI
    </button>
  );
}`;

export default function SdksPage() {
  return (
    <DocsPage
      href="/docs/sdks"
      title="SDKs"
      lede="Thin, dependency-free wrappers over the REST API. Use them for speed; everything they do is also documented as plain HTTP."
    >
      <section className="space-y-4">
        <H2 id="node">Node.js — @qiflow/sdk</H2>
        <P>Node 18+ (uses the global <code>fetch</code>). ESM with TypeScript types.</P>
        <CodeBlock title="Install" code={nodeInstall} lang="bash" />
        <CodeBlock title="Usage" code={nodeUsage} lang="js" />
        <H3>Verifying webhooks</H3>
        <CodeBlock title="Express" code={nodeWebhook} lang="js" />
        <H3>Errors</H3>
        <CodeBlock title="QiFlowError" code={nodeErrors} lang="js" />
        <Callout kind="info">
          Method map: <code>payments.create / retrieve / list</code>, <code>paymentLinks.create / retrieve / update / deactivate / list</code>,{' '}
          <code>webhookEndpoints.create / list / rotateSecret / delete / test / deliveries / retryDelivery</code>, plus <code>QiFlow.webhooks.verifySignature / constructEvent</code>. Low-level:{' '}
          <code>qiflow.request(method, path, body, query)</code>.
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="react">React — @qiflow/react</H2>
        <P>
          Bindings for <Link href="/docs/inline">Inline checkout</Link>: loads the script once, exposes <code>useQiFlowInline()</code> and a drop-in <code>{'<QiFlowButton>'}</code>. Works in Next.js client components.
        </P>
        <CodeBlock title="Install" code={reactInstall} lang="bash" />
        <CodeBlock title="Usage" code={reactUsage} lang="tsx" />
      </section>

      <section className="space-y-4">
        <H2 id="other">Other languages</H2>
        <P>
          Any HTTP client works — see <Link href="/docs/payments">Payments</Link> and <Link href="/docs/webhooks">Webhooks</Link> for cURL and a Python verification example. Official Python/PHP packages are on the roadmap.
        </P>
      </section>
    </DocsPage>
  );
}
