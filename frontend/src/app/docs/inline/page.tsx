import Link from 'next/link';
import { DocsPage, H2, H3, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { ParamTable } from '@/components/docs/ParamTable';
import { Callout } from '@/components/docs/Callout';
import { APP_BASE } from '@/lib/docs';

const SCRIPT = `${APP_BASE}/v1/inline.js`;

const serverFlow = `<!-- 1. Load the script once -->
<script src="${SCRIPT}"></script>

<!-- 2. Your server created the payment (POST /v1/payments) and rendered its paymentCode here -->
<button id="pay">Pay 12 QI</button>
<script>
  document.getElementById('pay').addEventListener('click', function () {
    QiFlow.inline({
      paymentCode: 'pay_4c1f28ccdc2cf482803fcf19',
      onSuccess: function (payment) {
        // payment.paymentCode, payment.txHash — now confirm server-side via webhook / GET /v1/payments/:id
        window.location.href = '/thanks?ref=' + payment.paymentCode;
      },
      onClose: function () { console.log('Checkout closed'); },
    }).open();
  });
</script>`;

const clientFlow = `<script src="${SCRIPT}"></script>
<script>
  QiFlow.inline({
    key: 'qiflow_pk_live_…',          // publishable key (Dashboard → Settings)
    amount: 12,
    currency: 'QI',                   // must match your receiving wallet's ledger
    description: 'Order #8492',
    reference: 'order-8492',          // your order id — makes this idempotent
    metadata: { customerId: 'c_42' },
    onSuccess: function (p) { /* show a thank-you; fulfil from the webhook */ },
    onError:   function (e) { alert(e.message); },
  }).open();
</script>`;

const events = `QiFlow.inline({
  paymentCode: 'pay_…',
  mode: 'modal',            // 'popup' opens a centered window instead (use if you embed QiFlow inside another iframe)
  autoCloseMs: 2000,        // close this long after COMPLETED; false = keep open
  onStatus:  (status) => {},            // CREATED → PROCESSING → COMPLETED | FAILED | EXPIRED
  onSuccess: (payment) => {},           // { paymentCode, status:'COMPLETED', txHash, amount, currency }
  onFailed:  (payment) => {},           // transaction reverted / wrong address / underpaid
  onError:   ({ code, message }) => {}, // e.g. INVALID_PUBLIC_KEY, WALLET_LEDGER_MISMATCH, POPUP_BLOCKED
  onClose:   () => {},                  // user dismissed (Escape, ×, overlay) or auto-close
});
const handle = QiFlow.inline(opts); handle.open(); handle.close(); handle.url;`;

const reactSnippet = `import { QiFlowButton } from '@qiflow/react';

<QiFlowButton paymentCode={paymentCode} onSuccess={(p) => router.push(\`/thanks?ref=\${p.paymentCode}\`)}>
  Pay 12 QI
</QiFlowButton>`;

export default function InlinePage() {
  return (
    <DocsPage
      href="/docs/inline"
      title="Inline checkout"
      lede="Keep customers on your page: one script tag opens QiFlow's hosted checkout in a modal (or popup) and calls you back when the payment completes. Works with Pelagus one-click for QUAI and the send-from-wallet flow for QI."
    >
      <section className="space-y-4">
        <H2 id="how">How it works</H2>
        <P>
          <code>{SCRIPT}</code> adds a global <code>QiFlow</code>. <code>QiFlow.inline(options).open()</code> renders an overlay with an iframe of the hosted checkout page (same page as{' '}
          <Link href="/docs/checkout">Hosted checkout</Link>, in <code>embed</code> mode). The checkout posts status events to your page; the script only trusts messages from the QiFlow origin.
        </P>
        <Callout kind="info" title="Two ways to start">
          <strong>Server-created</strong> (recommended): your backend calls <code>POST /v1/payments</code> with your secret key and passes the <code>paymentCode</code> to the browser.{' '}
          <strong>Client-only</strong>: the browser passes your <strong>publishable key</strong> + amount and QiFlow creates the payment for you — no backend call, like Paystack Inline.
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="server">Server-created payment</H2>
        <CodeBlock title="HTML" code={serverFlow} lang="html" />
      </section>

      <section className="space-y-4">
        <H2 id="client">Client-only with a publishable key</H2>
        <P>
          Get your key from <Link href="/dashboard/settings">Settings → Publishable key</Link> (format <code>qiflow_pk_live_…</code>). It is safe to expose: it can only{' '}
          <em>create a checkout for your account</em> — it cannot read payments or change settings.
        </P>
        <CodeBlock title="HTML" code={clientFlow} lang="html" />
        <ParamTable
          caption="Client-only options"
          params={[
            { name: 'key', type: 'string', required: true, description: 'Publishable key.' },
            { name: 'amount', type: 'number', required: true, description: 'Amount in QI/QUAI.' },
            { name: 'currency', type: '"QI" | "QUAI"', description: 'Default QI. Must match your receiving wallet ledger.' },
            { name: 'description', type: 'string', description: 'Shown on checkout (≤255 chars).' },
            { name: 'reference', type: 'string', description: 'Your order id (≤64). Re-opening with the same reference reuses the open/completed payment instead of creating a new one.' },
            { name: 'metadata', type: 'object', description: 'Stored on the payment; returned by the API and in webhooks.' },
          ]}
        />
        <Callout kind="warning" title="Never fulfil from the browser callback alone">
          <code>onSuccess</code> tells you the customer&apos;s page saw COMPLETED — a user can fake browser events. Always confirm with the <Link href="/docs/webhooks" className="text-mint underline underline-offset-4">webhook</Link> or{' '}
          <code>GET /v1/payments/:id</code> on your server before delivering goods.
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="options">Options &amp; events</H2>
        <CodeBlock title="All options" code={events} lang="js" />
        <H3>Behaviour</H3>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
          <li>Modal is full-screen on phones and a 480×720 card on desktop; Escape, the × button or clicking the overlay closes it (→ <code className="font-mono text-white">onClose</code>).</li>
          <li>The checkout runs on QiFlow&apos;s origin inside the iframe, so your page never touches keys or wallet APIs. Pelagus injects into iframes, so one-click QUAI payments work inline.</li>
          <li>If your page itself runs inside an iframe or blocks third-party frames, use <code className="font-mono text-white">mode: &apos;popup&apos;</code>.</li>
          <li>The script is versioned at <code className="font-mono text-white">/v1/</code>; we won&apos;t break the options above within v1.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 id="react">React / Next.js</H2>
        <P>
          Use <Link href="/docs/sdks">@qiflow/react</Link> — it loads the script once and gives you a button and a hook:
        </P>
        <CodeBlock title="React" code={reactSnippet} lang="tsx" />
      </section>
    </DocsPage>
  );
}
