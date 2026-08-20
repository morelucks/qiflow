import Link from 'next/link';
import { DocsPage, H2, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { Endpoint } from '@/components/docs/Endpoint';
import { ParamTable } from '@/components/docs/ParamTable';
import { Callout } from '@/components/docs/Callout';
import { API_BASE } from '@/lib/docs';

const createCurl = `curl -X POST ${API_BASE}/v1/webhooks \\
  -H "X-API-Key: qiflow_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com/webhooks/qiflow", "events": ["payment.completed", "payment.failed"] }'
# 201 -> { "id": "…", "url": "…", "secret": "whsec_…", "events": [...], "isActive": true }   ← secret shown once`;

const payload = `POST https://example.com/webhooks/qiflow
Content-Type: application/json
User-Agent: QiFlow-Webhooks/1.0
X-QiFlow-Event: payment.completed
X-QiFlow-Timestamp: 1787243214
X-QiFlow-Signature: sha256=3f1c…e9a2

{
  "event": "payment.completed",
  "payment": {
    "id": "6f0b4a3e-…",
    "paymentCode": "pay_4c1f28ccdc2cf482803fcf19",
    "amount": "12.00000000",
    "currency": "QI",
    "status": "COMPLETED",
    "txHash": "0x9d3a…",
    "receivingAddress": "0x00a1…",
    "completedAt": "2026-08-20T17:20:14.000Z"
  }
}`;

const verifyNode = `import crypto from 'node:crypto';
import express from 'express';

const app = express();

app.post('/webhooks/qiflow', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.header('X-QiFlow-Signature') ?? '';
  const ts = Number(req.header('X-QiFlow-Timestamp'));

  // 1) freshness — reject replays older than 5 minutes
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return res.status(401).end();

  // 2) signature over the RAW bytes
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.QIFLOW_WEBHOOK_SECRET)
    .update(req.body).digest('hex');
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return res.status(401).end();

  // 3) handle idempotently (we retry on non-2xx, so you may see an event twice)
  const { event, payment } = JSON.parse(req.body.toString('utf8'));
  if (event === 'payment.completed') markOrderPaid(payment.paymentCode, payment.txHash);
  if (event === 'payment.failed') markOrderFailed(payment.paymentCode);

  res.sendStatus(200);
});`;

const verifyPython = `import hmac, hashlib, time, json
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["QIFLOW_WEBHOOK_SECRET"].encode()

@app.post("/webhooks/qiflow")
def qiflow_webhook():
    raw = request.get_data()                      # raw bytes, not request.json
    ts = int(request.headers.get("X-QiFlow-Timestamp", "0"))
    if abs(time.time() - ts) > 300:
        abort(401)
    expected = "sha256=" + hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-QiFlow-Signature", "")):
        abort(401)
    body = json.loads(raw)
    if body["event"] == "payment.completed":
        mark_order_paid(body["payment"]["paymentCode"])
    return "", 200`;

const rotateCurl = `curl -X PUT ${API_BASE}/v1/webhooks/<id> -H "X-API-Key: qiflow_live_YOUR_KEY"
# -> { "secret": "whsec_…new" }  ← update your server, old secret stops working immediately`;

const testCurl = `curl -X POST ${API_BASE}/v1/webhooks/<id>/test -H "X-API-Key: qiflow_live_YOUR_KEY"
# -> { "ok": true, "statusCode": 200, "durationMs": 212, "event": "webhook.test", … }`;

export default function WebhooksPage() {
  return (
    <DocsPage
      href="/docs/webhooks"
      title="Webhooks"
      lede="QiFlow POSTs a signed JSON event to your endpoint when a payment completes or fails. Verify the signature, respond with a 2xx, and handle events idempotently — that's the whole contract."
    >
      <section className="space-y-4">
        <H2 id="register">Register an endpoint</H2>
        <P>
          Easiest: <Link href="/dashboard/webhooks">Dashboard → Webhooks → Add endpoint</Link>. Or via the API:
        </P>
        <Endpoint method="POST" path="/v1/webhooks" id="post-webhooks">
          <ParamTable
            caption="Request body"
            params={[
              { name: 'url', type: 'string', required: true, description: 'HTTPS URL of your receiver (http:// is accepted for local testing).' },
              { name: 'events', type: 'string[]', description: <>Defaults to <code className="font-mono text-white">{'["payment.completed","payment.failed"]'}</code>.</> },
            ]}
          />
          <CodeBlock title="Example" code={createCurl} lang="bash" />
        </Endpoint>
        <Callout kind="warning" title="The signing secret is shown once">
          Store <code>secret</code> (format <code>whsec_…</code>) in your server environment. Only a prefix is visible afterwards; use <strong>rotate</strong> below if you lose it.
        </Callout>
      </section>

      <section className="space-y-4">
        <H2 id="events">Events</H2>
        <ParamTable
          caption="Event types"
          params={[
            { name: 'payment.completed', type: 'event', description: 'Transaction verified on-chain; funds are in your wallet. Fulfil the order.' },
            { name: 'payment.failed', type: 'event', description: 'Submitted transaction reverted, paid the wrong address or underpaid.' },
            { name: 'webhook.test', type: 'event', description: 'Sent by “Send test” in the dashboard / the test endpoint. Same headers and signature; sample payment data.' },
          ]}
        />
      </section>

      <section className="space-y-4">
        <H2 id="request">The request</H2>
        <CodeBlock title="Delivery" code={payload} lang="http" />
        <ParamTable
          caption="Headers"
          params={[
            { name: 'X-QiFlow-Signature', type: 'sha256=<hex>', description: 'HMAC-SHA256 of the raw request body, keyed with your endpoint secret.' },
            { name: 'X-QiFlow-Timestamp', type: 'unix seconds', description: 'When the request was signed. Reject if more than 5 minutes old (replay protection).' },
            { name: 'X-QiFlow-Event', type: 'string', description: 'Same value as body.event — handy for routing before parsing.' },
          ]}
        />
      </section>

      <section className="space-y-4">
        <H2 id="verify">Verify the signature</H2>
        <P>
          Compute <code>sha256=</code> + HMAC-SHA256(secret, <strong className="text-white">raw body bytes</strong>) and compare with the header using a constant-time comparison.
          Don&apos;t parse-then-re-serialize the JSON first — key order would change the bytes.
        </P>
        <CodeBlock title="Verify + handle" tabs={[{ label: 'Node.js (Express)', code: verifyNode, lang: 'js' }, { label: 'Python (Flask)', code: verifyPython, lang: 'py' }]} />
      </section>

      <section className="space-y-4">
        <H2 id="delivery">Delivery, retries, idempotency</H2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
          <li>Any <strong className="text-white">2xx</strong> response within <strong className="text-white">10 seconds</strong> counts as delivered. Respond fast and do heavy work asynchronously.</li>
          <li>
            Non-2xx or timeout → retried up to <strong className="text-white">5 attempts</strong> with increasing delays (≈1 min, 5 min, 30 min, 2 h). After that the delivery is marked dead; you can retry it
            manually from the dashboard&apos;s delivery log.
          </li>
          <li>
            Because of retries you may receive the same event more than once — key your handling on <code className="font-mono text-white">payment.id</code> + <code className="font-mono text-white">event</code>.
          </li>
          <li>Order is not guaranteed across events; trust the payment <code className="font-mono text-white">status</code> in the payload (or re-fetch the payment).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <H2 id="manage">Manage endpoints</H2>
        <Endpoint method="GET" path="/v1/webhooks" id="get-webhooks"><P>List endpoints (secret prefix only).</P></Endpoint>
        <Endpoint method="PUT" path="/v1/webhooks/:id" id="put-webhook">
          <P>Rotates the signing secret and returns the new one once.</P>
          <CodeBlock title="Rotate" code={rotateCurl} lang="bash" />
        </Endpoint>
        <Endpoint method="POST" path="/v1/webhooks/:id/test" id="test-webhook">
          <P>Sends a signed <code>webhook.test</code> event synchronously and returns the HTTP status, latency and response snippet.</P>
          <CodeBlock title="Send test" code={testCurl} lang="bash" />
        </Endpoint>
        <Endpoint method="DELETE" path="/v1/webhooks/:id" id="delete-webhook"><P>Removes the endpoint.</P></Endpoint>
        <Endpoint method="GET" path="/v1/webhooks/deliveries?limit=" id="get-deliveries"><P>Recent delivery attempts (event, payment code, status, HTTP code, attempt).</P></Endpoint>
        <Endpoint method="POST" path="/v1/webhooks/deliveries/:id/retry" id="retry-delivery"><P>Re-sends one delivery now.</P></Endpoint>
      </section>
    </DocsPage>
  );
}
