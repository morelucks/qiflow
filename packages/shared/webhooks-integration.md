# Webhook Signature Verification Guide

QiFlow signs all outgoing webhook events with an HMAC-SHA256 signature. This allows merchants to verify that requests are genuine and have not been tampered with or replayed by attackers.

---

## Headers Included in Webhook Requests

Every webhook request contains the following headers:

| Header Name | Description | Example |
| :--- | :--- | :--- |
| `X-QiFlow-Signature` | The HMAC-SHA256 hex signature prefixed with `sha256=` | `sha256=a1b2c3d4...` |
| `X-QiFlow-Timestamp` | The Unix epoch timestamp of when the request was dispatched | `1700000000` |
| `X-QiFlow-Event` | The name of the event being triggered | `payment.completed` |

---

## Verification Process (Step-by-Step)

To secure your webhook endpoint, perform the following validation steps on every incoming request:

### 1. Reject Replayed Requests (Replay Attack Prevention)
Extract the `X-QiFlow-Timestamp` header. Compare it to the current time. If the request is older than **5 minutes (300 seconds)**, reject it. This prevents attackers from capturing a valid request and re-submitting it.

### 2. Verify the Signature
Generate an expected HMAC-SHA256 signature by signing the **raw request body** with your webhook signing secret (retrieved from the QiFlow dashboard).
> [!IMPORTANT]
> Always use the **raw request body bytes** for signature verification. Do **not** use the parsed JSON object, as re-serialization can change the order of keys and cause signature mismatch.

### 3. Use Timing-Safe Comparison
Compare the received signature with the expected signature.
> [!WARNING]
> You **MUST** use a timing-safe equality comparison (e.g., `crypto.timingSafeEqual`). Using a standard comparison operator like `===` makes your application vulnerable to **timing attacks**, allowing attackers to deduce the secret signature character-by-character.

---

## Verification Example (Node.js & TypeScript)

Here is a complete middleware example using Express:

```typescript
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Define the maximum allowed age of requests (5 minutes)
const MAX_AGE_SECONDS = 300;

export function verifyQiFlowWebhook(webhookSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signatureHeader = req.headers['x-qiflow-signature'] as string;
    const timestampHeader = req.headers['x-qiflow-timestamp'] as string;

    if (!signatureHeader || !timestampHeader) {
      return res.status(400).send('Missing webhook signature or timestamp headers');
    }

    // 1. Verify Timestamp Age (Prevent Replay Attacks)
    const timestampSeconds = parseInt(timestampHeader, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (isNaN(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_AGE_SECONDS) {
      return res.status(400).send('Webhook timestamp is invalid or has expired');
    }

    // 2. Sign the Raw Request Body
    // NOTE: Requires express.raw() or a way to access req.rawBody (raw Buffer)
    const rawBody: Buffer = (req as any).rawBody; 
    if (!rawBody) {
      return res.status(500).send('Raw body parser not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // 3. Timing-Safe Comparison
    const receivedSignature = signatureHeader.replace('sha256=', '');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (receivedBuffer.length !== expectedBuffer.length) {
      return res.status(400).send('Invalid webhook signature');
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

    if (!isValid) {
      return res.status(400).send('Invalid webhook signature');
    }

    // Payload is secure and authentic!
    next();
  };
}
```
