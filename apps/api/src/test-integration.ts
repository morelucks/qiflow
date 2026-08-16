import { createApp } from './app.js';
import type { Server } from 'http';
import http from 'http';
import { prisma } from './lib/prisma.js';
import { startWebhookWorker, stopWebhookWorker } from './workers/webhook-worker.js';

async function runIntegrationTest() {
  console.log('🧪 Starting live API integration test against PostgreSQL database...\n');

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
    console.log('   Auto-generated API Key prefix:', regData.data?.apiKey?.keyPrefix);
    if (regRes.status !== 201) throw new Error('Registration failed');

    const accessToken = regData.data.tokens.accessToken;
    const refreshToken = regData.data.tokens.refreshToken;

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

    // Test 4: Refresh token
    console.log('\n4️⃣ Testing POST /auth/refresh ...');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = (await refreshRes.json()) as any;
    console.log('   Status:', refreshRes.status, 'New access token generated:', Boolean(refreshData.data?.tokens?.accessToken));
    if (refreshRes.status !== 200) throw new Error('Token refresh failed');

    // Test 5: Get merchant profile (requireAuth)
    console.log('\n5️⃣ Testing GET /merchants/me (JWT Bearer Auth) ...');
    const meRes = await fetch(`${baseUrl}/merchants/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = (await meRes.json()) as any;
    console.log('   Status:', meRes.status, 'Business name:', meData.data?.businessName);
    if (meRes.status !== 200) throw new Error('Get merchant profile failed');

    // Test 6: Update merchant profile
    console.log('\n6️⃣ Testing PUT /merchants/me ...');
    const updateRes = await fetch(`${baseUrl}/merchants/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        businessName: 'Acme Qi Store Updated',
        walletAddress: '0x00473a216f2b1d382759e612bf6029fa037e95b2',
      }),
    });
    const updateData = (await updateRes.json()) as any;
    console.log('   Status:', updateRes.status, 'Updated business name:', updateData.data?.businessName);
    if (updateRes.status !== 200) throw new Error('Update merchant profile failed');

    // Test 7: Generate new API key
    console.log('\n7️⃣ Testing POST /merchants/me/api-keys ...');
    const newKeyRes = await fetch(`${baseUrl}/merchants/me/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: 'Secondary Secret Key' }),
    });
    const newKeyData = (await newKeyRes.json()) as any;
    console.log('   Status:', newKeyRes.status, 'New Raw API Key:', newKeyData.data?.rawKey?.substring(0, 16) + '...');
    if (newKeyRes.status !== 201) throw new Error('API Key creation failed');

    // Test 8: List API keys
    console.log('\n8️⃣ Testing GET /merchants/me/api-keys ...');
    const listKeysRes = await fetch(`${baseUrl}/merchants/me/api-keys`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listKeysData = (await listKeysRes.json()) as any;
    console.log('   Status:', listKeysRes.status, 'API Key count:', listKeysData.data?.length);
    console.log('   Prefixes listed (no raw keys in listing):', listKeysData.data?.map((k: any) => k.keyPrefix));
    if (listKeysRes.status !== 200) throw new Error('List API keys failed');

    // Test 9: Get merchant stats
    console.log('\n9️⃣ Testing GET /merchants/me/stats ...');
    const statsRes = await fetch(`${baseUrl}/merchants/me/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const statsData = (await statsRes.json()) as any;
    console.log('   Status:', statsRes.status, 'Stats:', JSON.stringify(statsData.data));
    if (statsRes.status !== 200) throw new Error('Get stats failed');

    // Test 10: Revoke API key
    console.log('\n🔟 Testing DELETE /merchants/me/api-keys/:id ...');
    const createdKeyId = newKeyData.data.id;
    const deleteKeyRes = await fetch(`${baseUrl}/merchants/me/api-keys/${createdKeyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const deleteKeyData = (await deleteKeyRes.json()) as any;
    console.log('   Status:', deleteKeyRes.status, 'Message:', deleteKeyData.message);
    if (deleteKeyRes.status !== 200) throw new Error('Revoke API key failed');

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
    } catch (e) {
      // ignore
    }
    server.close();
  }
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
