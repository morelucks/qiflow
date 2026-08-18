/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { createApp } from './app.js';
import type { Server } from 'http';
import http from 'http';
import { prisma } from './lib/prisma.js';
import { startWebhookWorker, stopWebhookWorker } from './workers/webhook-worker.js';

async function runIntegrationTest() {
  console.log('🧪 Starting live API integration test suite against PostgreSQL database...\n');

  const app = createApp();
  const PORT = 3099;

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const baseUrl = `http://localhost:${PORT}`;

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing GET /health ...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('   Status:', healthRes.status, JSON.stringify(healthData));
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // Test 2: Register merchant
    console.log('\n2️⃣ Testing POST /auth/register ...');
    const testEmail = `merchant_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        businessName: 'Acme Qi Store',
      }),
    });
    const regData = (await regRes.json()) as any;
    console.log('   Status:', regRes.status);
    console.log('   Registered merchant ID:', regData.data?.merchant?.id);
    console.log('   Initial raw API Key:', regData.data?.apiKey?.rawKey);
    if (regRes.status !== 201) throw new Error('Registration failed');

    const accessToken = regData.data.tokens.accessToken;
    // const refreshToken = regData.data.tokens.refreshToken;
    const apiKey = regData.data.apiKey.rawKey;

    // Test 3: Login
    console.log('\n3️⃣ Testing POST /auth/login ...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const loginData = (await loginRes.json()) as any;
    console.log('   Status:', loginRes.status, 'Logged in email:', loginData.data?.merchant?.email);
    if (loginRes.status !== 200) throw new Error('Login failed');

    // Test 4: Create Webhook Endpoint
    console.log('\n4️⃣ Testing POST /v1/webhooks (API Key Auth) ...');
    const webhookRes = await fetch(`${baseUrl}/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        url: 'https://example.com/api/webhook-test',
        events: ['payment.completed', 'payment.failed'],
      }),
    });
    const webhookData = (await webhookRes.json()) as any;
    console.log('   Status:', webhookRes.status, 'Webhook secret:', webhookData.data?.secret);
    if (webhookRes.status !== 201) throw new Error('Webhook creation failed');

    // Test 5: Create Payment Session
    console.log('\n5️⃣ Testing POST /v1/payments (API Key Auth) ...');
    const payRes = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        amount: 25.5,
        currency: 'QI',
        description: 'Test Qi Payment Session',
      }),
    });
    const payData = (await payRes.json()) as any;
    console.log('   Status:', payRes.status, 'Payment Code:', payData.data?.paymentCode);
    if (payRes.status !== 201) throw new Error('Payment creation failed');

    const paymentCode = payData.data.paymentCode;
    const paymentId = payData.data.id;

    // Test 6: Public Payment Lookup
    console.log('\n6️⃣ Testing GET /v1/payments/public/code/:code ...');
    const publicPayRes = await fetch(`${baseUrl}/v1/payments/public/code/${paymentCode}`);
    const publicPayData = (await publicPayRes.json()) as any;
    console.log('   Status:', publicPayRes.status, 'Merchant:', publicPayData.data?.merchantName);
    if (publicPayRes.status !== 200) throw new Error('Public payment lookup failed');

    // Test 7: Simulate Payment Completion & Trigger Webhooks
    console.log('\n7️⃣ Testing POST /v1/payments/:id/simulate ...');
    const simRes = await fetch(`${baseUrl}/v1/payments/${paymentId}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const simData = (await simRes.json()) as any;
    console.log('   Status:', simRes.status, 'Simulated Payment Status:', simData.data?.status);
    if (simRes.status !== 200 || simData.data?.status !== 'COMPLETED')
      throw new Error('Payment simulation failed');

    // Test 8: List Webhook Deliveries
    console.log('\n8️⃣ Testing GET /v1/webhooks/deliveries ...');
    const delRes = await fetch(`${baseUrl}/v1/webhooks/deliveries`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const delData = (await delRes.json()) as any;
    console.log('   Status:', delRes.status, 'Delivery count:', delData.data?.length);
    if (delRes.status !== 200) throw new Error('Fetching webhook deliveries failed');

    // Test 9: Create Payment Link
    console.log('\n9️⃣ Testing POST /v1/payment-links ...');
    const linkRes = await fetch(`${baseUrl}/v1/payment-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: 'Coffee Donation Link',
        amount: 5.0,
        currency: 'QI',
        description: 'Support creator with Qi',
        fixedAmount: true,
      }),
    });
    const linkData = (await linkRes.json()) as any;
    console.log('   Status:', linkRes.status, 'Link Code:', linkData.data?.linkCode);
    if (linkRes.status !== 201) throw new Error('Payment link creation failed');

    const linkCode = linkData.data.linkCode;

    // Test 10: Public Payment Link Lookup & Checkout Generation
    console.log('\n🔟 Testing GET & POST /v1/payment-links/public/:linkCode ...');
    const pubLinkRes = await fetch(`${baseUrl}/v1/payment-links/public/${linkCode}`);
    const pubLinkData = (await pubLinkRes.json()) as any;
    console.log('   Public Link Lookup Status:', pubLinkRes.status, 'Name:', pubLinkData.data?.name);

    const checkoutRes = await fetch(`${baseUrl}/v1/payment-links/public/${linkCode}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const checkoutData = (await checkoutRes.json()) as any;
    console.log(
      '   Checkout Session Generation Status:',
      checkoutRes.status,
      'Redirect paymentCode:',
      checkoutData.data?.paymentCode
    );

    if (pubLinkRes.status !== 200 || checkoutRes.status !== 200)
      throw new Error('Payment link public checkout failed');

    // Test 11: Register Webhook
    console.log('\n1️⃣1️⃣ Testing POST /v1/webhooks ...');
    const mockReceiverPort = 3098;
    const webhookUrl = `http://localhost:${mockReceiverPort}/webhook`;
    const regWebhookRes = await fetch(`${baseUrl}/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['payment.completed'],
      }),
    });
    const regWebhookData = (await regWebhookRes.json()) as any;
    console.log('   Status:', regWebhookRes.status, 'Url:', regWebhookData.data?.url);
    if (regWebhookRes.status !== 201) throw new Error('Register webhook failed');
    if (!regWebhookData.data.secret.startsWith('whsec_')) throw new Error('Invalid secret prefix');
    const webhookId = regWebhookData.data.id;
    let webhookSecret = regWebhookData.data.secret;

    // Test 12: List Webhooks
    console.log('\n1️⃣2️⃣ Testing GET /v1/webhooks ...');
    const listWebhookRes = await fetch(`${baseUrl}/v1/webhooks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listWebhookData = (await listWebhookRes.json()) as any;
    console.log('   Status:', listWebhookRes.status, 'Count:', listWebhookData.data?.length);
    if (listWebhookRes.status !== 200) throw new Error('List webhooks failed');
    if (listWebhookData.data.some((w: any) => w.secret)) throw new Error('Secret leaked in list response');

    // Test 13: Rotate Webhook Secret
    console.log('\n1️⃣3️⃣ Testing PUT /v1/webhooks/:id (Rotate Secret) ...');
    const rotateRes = await fetch(`${baseUrl}/v1/webhooks/${webhookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        events: ['payment.completed', 'payment.failed'],
      }),
    });
    const rotateData = (await rotateRes.json()) as any;
    console.log('   Status:', rotateRes.status, 'New Secret:', rotateData.data?.secret ? 'Generated' : 'Missing');
    if (rotateRes.status !== 200) throw new Error('Rotate webhook secret failed');
    if (rotateData.data.secret === webhookSecret) throw new Error('Secret was not rotated');
    webhookSecret = rotateData.data.secret;

    // Test 14: Webhook delivery, signing, and verification pipeline
    console.log('\n1️⃣4️⃣ Testing Webhook delivery and signature verification ...');
    
    let receivedRequest: { headers: any; body: string } | null = null;
    const mockReceiver = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        receivedRequest = {
          headers: req.headers,
          body,
        };
        res.writeHead(200);
        res.end('OK');
      });
    });

    await new Promise<void>((resolve) => {
      mockReceiver.listen(mockReceiverPort, () => resolve());
    });

    try {
      const dummyPayment = await prisma.payment.create({
        data: {
          merchantId: regData.data.merchant.id,
          amount: '10.0',
          currency: 'QI',
          paymentCode: 'pay_test_' + Date.now(),
          receivingAddress: '0x123',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          status: 'PENDING',
        },
      });

      // Start the webhook worker
      startWebhookWorker();

      // Enqueue a webhook job
      const { enqueueWebhookEvent } = await import('./lib/webhook-queue.js');
      await enqueueWebhookEvent(
        regData.data.merchant.id,
        dummyPayment.id,
        'payment.completed',
        { event: 'payment.completed', amount: '10.0' }
      );

      console.log('   Waiting for webhook delivery to mock receiver...');
      for (let i = 0; i < 20; i++) {
        if (receivedRequest) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!receivedRequest) {
        throw new Error('Mock receiver did not receive webhook');
      }

      console.log('   Received webhook request successfully!');
      
      const sigHeader = (receivedRequest as any).headers['x-qiflow-signature'];
      const tsHeader = (receivedRequest as any).headers['x-qiflow-timestamp'];
      const evHeader = (receivedRequest as any).headers['x-qiflow-event'];

      if (!sigHeader || !tsHeader || evHeader !== 'payment.completed') {
        throw new Error('Missing or invalid webhook headers on receiver');
      }

      const { verifyWebhookSignature, isWebhookTimestampValid } = await import('@qiflow/shared');
      const rawBody = Buffer.from((receivedRequest as any).body);
      const isSigValid = verifyWebhookSignature(rawBody, webhookSecret, sigHeader);
      
      console.log('   Is Signature Valid:', isSigValid);
      if (!isSigValid) throw new Error('Webhook signature verification failed');

      const isTsValid = isWebhookTimestampValid(parseInt(tsHeader, 10));
      console.log('   Is Timestamp Valid:', isTsValid);
      if (!isTsValid) throw new Error('Webhook timestamp verification failed');

      const isTamperedValid = verifyWebhookSignature(
        Buffer.from((receivedRequest as any).body + 'tampered'),
        webhookSecret,
        sigHeader
      );
      console.log('   Is Tampered Signature Valid (should be false):', isTamperedValid);
      if (isTamperedValid) throw new Error('Tampered signature check passed when it should fail');

      const isOldTsValid = isWebhookTimestampValid(Math.floor(Date.now() / 1000) - 400);
      console.log('   Is Old Timestamp Valid (should be false):', isOldTsValid);
      if (isOldTsValid) throw new Error('Old timestamp check passed when it should fail');

      const deliveryRecord = await prisma.webhookDelivery.findFirst({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
      });

      if (!deliveryRecord || deliveryRecord.status !== 'DELIVERED') {
        throw new Error('WebhookDelivery DB log missing or incorrect status');
      }
      console.log('   WebhookDelivery logged in DB with status:', deliveryRecord.status);

    } finally {
      await new Promise<void>((resolve) => mockReceiver.close(() => resolve()));
    }

    // Test 15: Revoke/Delete Webhook
    console.log('\n1️⃣5️⃣ Testing DELETE /v1/webhooks/:id ...');
    const deleteWebhookRes = await fetch(`${baseUrl}/v1/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const deleteWebhookData = (await deleteWebhookRes.json()) as any;
    console.log('   Status:', deleteWebhookRes.status, 'Message:', deleteWebhookData.message);
    if (deleteWebhookRes.status !== 200) throw new Error('Revoke webhook failed');

    const countAfterDelete = await prisma.webhook.count({ where: { id: webhookId } });
    if (countAfterDelete !== 0) throw new Error('Webhook was not deleted from database');

    // Test 16: Custom retry delay strategy validation
    console.log('\n1️⃣6️⃣ Testing custom retry delay schedule ...');
    const { WEBHOOK_RETRY_DELAYS_MS } = await import('@qiflow/shared');
    if (WEBHOOK_RETRY_DELAYS_MS[0] !== 0) throw new Error('Retry 1 delay mismatch');
    if (WEBHOOK_RETRY_DELAYS_MS[1] !== 60_000) throw new Error('Retry 2 delay mismatch');
    if (WEBHOOK_RETRY_DELAYS_MS[2] !== 300_000) throw new Error('Retry 3 delay mismatch');
    if (WEBHOOK_RETRY_DELAYS_MS[3] !== 1_800_000) throw new Error('Retry 4 delay mismatch');
    if (WEBHOOK_RETRY_DELAYS_MS[4] !== 7_200_000) throw new Error('Retry 5 delay mismatch');
    console.log('   All retry delays verified.');

    console.log('\n✨ ALL INTEGRATION TESTS PASSED 100% CLEANLY! ✨\n');
  } finally {
    await stopWebhookWorker();
    try {
      const { redisConnection, webhookQueue } = await import('./lib/webhook-queue.js');
      await webhookQueue.close();
      await redisConnection.quit();
    } catch {
      // ignore
    }
    server.close();
  }
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
