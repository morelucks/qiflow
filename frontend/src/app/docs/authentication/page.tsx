import Link from 'next/link';
import { DocsPage, H2, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Callout } from '@/components/docs/Callout';
import { API_BASE } from '@/lib/docs';

const example = `curl ${API_BASE}/v1/payments \\
  -H "X-API-Key: qiflow_live_YOUR_KEY"`;

const unauthorized = `HTTP/1.1 401 Unauthorized
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid or revoked API key" }
}`;

export default function AuthenticationPage() {
  return (
    <DocsPage
      href="/docs/authentication"
      title="Authentication"
      lede="Every merchant API request is authenticated with an API key sent in the X-API-Key header. Keys are created and revoked in the dashboard."
    >
      <section className="space-y-4">
        <H2 id="api-keys">API keys</H2>
        <P>
          Create keys in <Link href="/dashboard/settings">Dashboard → Settings → API keys</Link>. Give each integration its own key so you can revoke one without
          affecting the others. The full secret is shown <strong className="text-white">once</strong>; afterwards only the prefix and last four characters are visible.
        </P>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
          <li>
            Format: <code className="font-mono text-white">qiflow_live_</code> followed by 48 hex characters.
          </li>
          <li>Keys never expire; revoke them from Settings when you rotate.</li>
          <li>A revoked key fails immediately with <code className="font-mono text-white">401 UNAUTHORIZED</code>.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 id="header">Sending the header</H2>
        <CodeBlock title="Authenticated request" code={example} lang="bash" />
        <CodeBlock title="Missing / invalid key" code={unauthorized} lang="http" />
      </section>

      <section className="space-y-4">
        <H2 id="scope">What an API key can do</H2>
        <P>
          API keys are scoped to the <strong className="text-white">Payments API</strong>: <code>/v1/payments</code>, <code>/v1/payment-links</code> and{' '}
          <code>/v1/webhooks</code>. They cannot change your account, receiving wallet, or create/revoke other keys — those actions are dashboard-only (browser
          session). This keeps the blast radius small if a key leaks.
        </P>
        <Callout kind="warning" title="Keep keys server-side">
          Never embed an API key in a web page, mobile app or public repository. If you need a customer-facing flow, create the payment on your server and
          send the customer to the hosted <Link href="/docs/checkout" className="text-mint underline underline-offset-4">checkout URL</Link> — the checkout page itself
          needs no credentials.
        </Callout>
      </section>
    </DocsPage>
  );
}
