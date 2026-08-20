import Link from 'next/link';
import { DocsPage, H2, P } from '@/components/docs/DocsPage';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { ParamTable } from '@/components/docs/ParamTable';
import { Callout } from '@/components/docs/Callout';

const envelope = `HTTP/1.1 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount: Amount must be greater than 0",
    "details": { "amount": ["Amount must be greater than 0"] }
  }
}`;

const rateLimited = `HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 500
RateLimit-Remaining: 0
RateLimit-Reset: 412
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Too many requests, please try again later." } }`;

export default function ErrorsPage() {
  return (
    <DocsPage
      href="/docs/errors"
      title="Errors & limits"
      lede="Every error uses the same JSON envelope with a stable machine-readable code. Handle the code, show the message to humans."
    >
      <section className="space-y-4">
        <H2 id="envelope">Error envelope</H2>
        <CodeBlock title="Shape" code={envelope} lang="http" />
        <P>
          <code>details</code> is only present on validation errors and maps field → messages. Success responses are <code>{'{ success:true, data, pagination? }'}</code>.
        </P>
      </section>

      <section className="space-y-4">
        <H2 id="codes">Error codes</H2>
        <ParamTable
          caption="Error codes"
          params={[
            { name: 'VALIDATION_ERROR', type: '400', description: 'Request body/query failed validation. See details.' },
            { name: 'UNAUTHORIZED', type: '401', description: 'Missing, invalid or revoked X-API-Key.' },
            { name: 'NOT_FOUND', type: '404', description: 'No such payment / link / webhook for your account, or unknown route.' },
            { name: 'WALLET_NOT_SET', type: '400', description: <>Receiving wallet not configured. Set it in <Link href="/dashboard/settings" className="text-mint underline underline-offset-4">Settings</Link>.</> },
            { name: 'WALLET_LEDGER_MISMATCH', type: '400', description: 'Payment currency does not match the wallet ledger (Qi address ↔ QI, Quai address ↔ QUAI).' },
            { name: 'LINK_INACTIVE', type: '400', description: 'Public checkout on a deactivated/unknown payment link.' },
            { name: 'PAYMENT_EXPIRED', type: '410', description: 'Transaction submitted after expiresAt.' },
            { name: 'ALREADY_COMPLETED', type: '409', description: 'Transaction submitted for a payment that is already COMPLETED.' },
            { name: 'TX_ALREADY_SUBMITTED', type: '409', description: 'A different transaction hash is already being verified for this payment.' },
            { name: 'PAYMENT_CLOSED', type: '409', description: 'Payment is EXPIRED / FAILED / CANCELLED and can no longer accept a transaction.' },
            { name: 'RATE_LIMITED', type: '429', description: 'Too many requests from your IP. Back off and retry after RateLimit-Reset.' },
            { name: 'INTERNAL_ERROR', type: '500', description: 'Something broke on our side. Safe to retry with backoff.' },
          ]}
        />
      </section>

      <section className="space-y-4">
        <H2 id="limits">Rate limits</H2>
        <P>
          The API allows <strong className="text-white">500 requests per 15 minutes per IP</strong> across all endpoints, plus tighter limits on the public checkout transaction
          endpoint (20/min). Limits are advertised with standard <code>RateLimit-*</code> headers.
        </P>
        <CodeBlock title="429 response" code={rateLimited} lang="http" />
        <Callout kind="tip" title="Retrying safely">
          Creating a payment is not idempotent — a retried POST makes a second payment. If a create request times out, list recent payments (or look for your{' '}
          <code>metadata.orderId</code>) before retrying. GETs and webhook handling should always be safe to repeat.
        </Callout>
      </section>
    </DocsPage>
  );
}
