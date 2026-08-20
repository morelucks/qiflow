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
    // Unique per run (DB persists between runs); mixed case to prove normalization
    const runHex = Date.now().toString(16).padStart(12, '0');
    const testWalletMixed = `0x00A1b2C3d4E5f60718293A4b5C6d7E${runHex.slice(-10).toUpperCase()}`;
    const testWalletLower = testWalletMixed.toLowerCase();
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        businessName: 'Acme Qi Store',
        walletAddress: testWalletMixed,
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
    console.log('   Status:', payRes.status, 'Payment Code:', payData.data?.paymentCode, 'Checkout URL:', payData.data?.checkoutUrl);
    if (payRes.status !== 201) throw new Error('Payment creation failed');
    if (!payData.data?.checkoutUrl || !payData.data.checkoutUrl.endsWith(`/pay/${payData.data.paymentCode}`)) {
      throw new Error('Payment creation failed: checkoutUrl missing or incorrect');
    }

    const paymentCode = payData.data.paymentCode;
    const paymentId = payData.data.id;

    // Test 6: Public Payment Lookup
    console.log('\n6️⃣ Testing GET /v1/payments/public/code/:code ...');
    const publicPayRes = await fetch(`${baseUrl}/v1/payments/public/code/${paymentCode}`);
    const publicPayData = (await publicPayRes.json()) as any;
    console.log('   Status:', publicPayRes.status, 'Merchant:', publicPayData.data?.merchantName);
    if (publicPayRes.status !== 200) throw new Error('Public payment lookup failed');
    if (publicPayData.data?.receivingAddress !== testWalletLower)
      throw new Error('Public payment does not carry the merchant receiving wallet (lowercased)');

    // Test 6b: Payer submits a tx hash for on-chain verification (public)
    console.log('\n6️⃣b Testing POST /v1/payments/public/code/:code/tx ...');
    const fakeTxHash = `0x${'ab'.repeat(32)}`;
    const badTxRes = await fetch(`${baseUrl}/v1/payments/public/code/${paymentCode}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: 'not-a-hash' }),
    });
    console.log('   Invalid hash Status:', badTxRes.status);
    if (badTxRes.status !== 400) throw new Error('Invalid tx hash was accepted');
    const txRes = await fetch(`${baseUrl}/v1/payments/public/code/${paymentCode}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: fakeTxHash }),
    });
    const txData = (await txRes.json()) as any;
    console.log('   Status:', txRes.status, 'Payment status:', txData.data?.status);
    if (txRes.status !== 200 || txData.data?.status !== 'PROCESSING') throw new Error('Tx submission failed');
    const otherTxRes = await fetch(`${baseUrl}/v1/payments/public/code/${paymentCode}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: `0x${'cd'.repeat(32)}` }),
    });
    console.log('   Second different hash Status:', otherTxRes.status);
    if (otherTxRes.status !== 409) throw new Error('A second conflicting tx hash was accepted');

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

      // Test 14b: "Send test event" to the endpoint (synchronous, signed)
      console.log('   Testing POST /v1/webhooks/:id/test ...');
      receivedRequest = null;
      const testRes = await fetch(`${baseUrl}/v1/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const testData = (await testRes.json()) as any;
      console.log('   Test Status:', testRes.status, 'ok:', testData.data?.ok, 'HTTP', testData.data?.statusCode);
      if (testRes.status !== 200 || testData.data?.ok !== true || testData.data?.statusCode !== 200)
        throw new Error('Webhook test event was not delivered');
      if (!receivedRequest) throw new Error('Mock receiver did not receive the test event');
      const testBody = JSON.parse((receivedRequest as any).body);
      if (testBody.event !== 'webhook.test') throw new Error('Test event payload has wrong event name');
      const testSigOk = verifyWebhookSignature(
        Buffer.from((receivedRequest as any).body),
        webhookSecret,
        (receivedRequest as any).headers['x-qiflow-signature'] as string,
      );
      console.log('   Test event signature valid:', testSigOk);
      if (!testSigOk) throw new Error('Test event signature did not verify');

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
    // Test 17: Wallet Authentication (Nonce & SIWE Verification)
    console.log('\n1️⃣7️⃣ Testing Wallet Authentication (GET /auth/wallet/nonce & POST /auth/wallet/verify) ...');
    const { Wallet } = await import('ethers');
    const testWallet = Wallet.createRandom();
    const walletAddr = testWallet.address;

    const nonceRes = await fetch(`${baseUrl}/auth/wallet/nonce?address=${walletAddr}`);
    const nonceData = (await nonceRes.json()) as any;
    console.log('   Nonce Status:', nonceRes.status, 'Message:', nonceData.data?.message);
    if (nonceRes.status !== 200 || !nonceData.data?.message) throw new Error('Wallet nonce fetch failed');

    const signature = await testWallet.signMessage(nonceData.data.message);

    const verifyRes = await fetch(`${baseUrl}/auth/wallet/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletAddr,
        message: nonceData.data.message,
        signature,
        businessName: 'Test Web3 Merchant',
      }),
    });
    const verifyData = (await verifyRes.json()) as any;
    console.log('   Verify Status:', verifyRes.status, 'Merchant ID:', verifyData.data?.merchant?.id);
    if (verifyRes.status !== 200 || !verifyData.data?.tokens?.accessToken) throw new Error('Wallet verify signature failed');
    if (verifyData.data?.merchant?.walletAddress !== walletAddr.toLowerCase()) {
      throw new Error('Wallet address was not normalized to lowercase');
    }

    const postVerify = (body: Record<string, unknown>) =>
      fetch(`${baseUrl}/auth/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    // 17b: replaying the same signed challenge must be rejected (single-use)
    const replayRes = await postVerify({ address: walletAddr, message: nonceData.data.message, signature });
    console.log('   Replay Status:', replayRes.status);
    if (replayRes.status !== 401) throw new Error('Replayed wallet challenge was accepted');

    // 17c: a valid signature over an arbitrary message with no issued challenge must be rejected
    const rogueMessage = 'Sign in to QiFlow with nonce: attacker-chosen';
    const rogueSig = await testWallet.signMessage(rogueMessage);
    const noChallengeRes = await postVerify({ address: walletAddr, message: rogueMessage, signature: rogueSig });
    console.log('   No-challenge Status:', noChallengeRes.status);
    if (noChallengeRes.status !== 401) throw new Error('Signature without an issued challenge was accepted');

    // 17d: a tampered message (challenge issued, but different text signed) must be rejected
    const nonce2Res = await fetch(`${baseUrl}/auth/wallet/nonce?address=${walletAddr}`);
    const nonce2Data = (await nonce2Res.json()) as any;
    if (nonce2Res.status !== 200 || !nonce2Data.data?.message) {
      throw new Error(
        `Second wallet nonce fetch failed (status ${nonce2Res.status}). ` +
          'Note: /auth/wallet/* shares the login rate limiter — raise RATE_LIMIT_AUTH_LOGIN_MAX when running this test.',
      );
    }
    const tampered = `${nonce2Data.data.message}\nExtra: line`;
    const tamperedSig = await testWallet.signMessage(tampered);
    const tamperedRes = await postVerify({ address: walletAddr, message: tampered, signature: tamperedSig });
    console.log('   Tampered Status:', tamperedRes.status);
    if (tamperedRes.status !== 401) throw new Error('Tampered wallet challenge was accepted');

    // 17e: issued message is domain-bound (EIP-4361 shape)
    if (!/^.+ wants you to sign in with your Ethereum account:\n0x/.test(nonceData.data.message)) {
      throw new Error('Wallet challenge is not an EIP-4361 message');
    }
    console.log('   Wallet replay / no-challenge / tampered cases all rejected.');

    // Test 18: Merchant API key management
    console.log('\n1️⃣8️⃣ Testing /merchants/me/api-keys (list / create / revoke) ...');
    const authH = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const keysRes = await fetch(`${baseUrl}/merchants/me/api-keys`, { headers: authH });
    const keysData = (await keysRes.json()) as any;
    console.log('   List Status:', keysRes.status, 'Count:', keysData.data?.length);
    if (keysRes.status !== 200 || !Array.isArray(keysData.data) || keysData.data.length < 1)
      throw new Error('API key list failed');
    if (keysData.data.some((k: any) => k.keyHash || k.rawKey)) throw new Error('API key list leaks secrets');

    const newKeyRes = await fetch(`${baseUrl}/merchants/me/api-keys`, {
      method: 'POST',
      headers: authH,
      body: JSON.stringify({ name: 'CI key' }),
    });
    const newKeyData = (await newKeyRes.json()) as any;
    console.log('   Create Status:', newKeyRes.status, 'Prefix:', newKeyData.data?.keyPrefix);
    if (newKeyRes.status !== 201 || !String(newKeyData.data?.rawKey).startsWith('qiflow_live_'))
      throw new Error('API key creation failed');

    const useNewKeyRes = await fetch(`${baseUrl}/v1/payments`, { headers: { 'X-API-Key': newKeyData.data.rawKey } });
    console.log('   New key usable Status:', useNewKeyRes.status);
    if (useNewKeyRes.status !== 200) throw new Error('Newly created API key was rejected');

    const apiKeyOnMerchantRoute = await fetch(`${baseUrl}/merchants/me/api-keys`, {
      method: 'POST',
      headers: { 'X-API-Key': newKeyData.data.rawKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'should fail' }),
    });
    console.log('   API key cannot mint keys Status:', apiKeyOnMerchantRoute.status);
    if (apiKeyOnMerchantRoute.status !== 401) throw new Error('API key was allowed to mint API keys');

    const revokeRes = await fetch(`${baseUrl}/merchants/me/api-keys/${newKeyData.data.id}`, {
      method: 'DELETE',
      headers: authH,
    });
    console.log('   Revoke Status:', revokeRes.status);
    if (revokeRes.status !== 200) throw new Error('API key revoke failed');
    const useRevokedRes = await fetch(`${baseUrl}/v1/payments`, { headers: { 'X-API-Key': newKeyData.data.rawKey } });
    console.log('   Revoked key Status:', useRevokedRes.status);
    if (useRevokedRes.status !== 401) throw new Error('Revoked API key still works');

    // Test 19: Receiving wallet is required before creating payments
    console.log('\n1️⃣9️⃣ Testing wallet requirement + PUT /merchants/me ...');
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `nowallet_${Date.now()}@example.com`,
        password: 'Password123!',
        businessName: 'No Wallet Yet',
      }),
    });
    const reg2Data = (await reg2Res.json()) as any;
    if (reg2Res.status !== 201) throw new Error('Second registration failed');
    const auth2H = { Authorization: `Bearer ${reg2Data.data.tokens.accessToken}`, 'Content-Type': 'application/json' };

    const noWalletPay = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: auth2H,
      body: JSON.stringify({ amount: 1, currency: 'QI' }),
    });
    const noWalletData = (await noWalletPay.json()) as any;
    console.log('   Create payment without wallet Status:', noWalletPay.status, noWalletData.error?.code);
    if (noWalletPay.status !== 400 || noWalletData.error?.code !== 'WALLET_NOT_SET')
      throw new Error('Payment creation without a wallet was not blocked');

    const badWalletRes = await fetch(`${baseUrl}/merchants/me`, {
      method: 'PUT',
      headers: auth2H,
      body: JSON.stringify({ walletAddress: '0x1234' }),
    });
    console.log('   Invalid wallet Status:', badWalletRes.status);
    if (badWalletRes.status !== 400) throw new Error('Invalid wallet address was accepted');

    const dupWalletRes = await fetch(`${baseUrl}/merchants/me`, {
      method: 'PUT',
      headers: auth2H,
      body: JSON.stringify({ walletAddress: testWalletMixed }),
    });
    console.log('   Duplicate wallet Status:', dupWalletRes.status);
    if (dupWalletRes.status !== 409) throw new Error('Duplicate wallet address was accepted');

    const setWalletRes = await fetch(`${baseUrl}/merchants/me`, {
      method: 'PUT',
      headers: auth2H,
      body: JSON.stringify({ walletAddress: `0x00FFEEDDCCBBAA998877665544332211${runHex.slice(-8).toUpperCase()}` }),
    });
    const setWalletData = (await setWalletRes.json()) as any;
    console.log('   Set wallet Status:', setWalletRes.status, 'Saved:', setWalletData.data?.walletAddress);
    if (setWalletRes.status !== 200 || setWalletData.data?.walletAddress !== `0x00ffeeddccbbaa998877665544332211${runHex.slice(-8)}`)
      throw new Error('Wallet address was not saved / normalized');

    const mismatchPay = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: auth2H,
      body: JSON.stringify({ amount: 1, currency: 'QUAI' }),
    });
    const mismatchData = (await mismatchPay.json()) as any;
    console.log('   QUAI payment to Qi wallet Status:', mismatchPay.status, mismatchData.error?.code);
    if (mismatchPay.status !== 400 || mismatchData.error?.code !== 'WALLET_LEDGER_MISMATCH')
      throw new Error('QUAI payment to a Qi address was not blocked');

    const withWalletPay = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: auth2H,
      body: JSON.stringify({ amount: 1, currency: 'QI' }),
    });
    const withWalletData = (await withWalletPay.json()) as any;
    console.log('   Create payment with wallet Status:', withWalletPay.status, 'Checkout:', withWalletData.data?.checkoutUrl);
    if (withWalletPay.status !== 201 || !withWalletData.data?.checkoutUrl)
      throw new Error('Payment creation after setting wallet failed');

    // Test 19b: Dashboard stats
    console.log('\n1️⃣9️⃣b Testing GET /merchants/me/stats ...');
    const statsRes = await fetch(`${baseUrl}/merchants/me/stats`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const statsData = (await statsRes.json()) as any;
    console.log('   Status:', statsRes.status, 'payments:', statsData.data?.payments?.total, 'received:', JSON.stringify(statsData.data?.received));
    if (statsRes.status !== 200 || typeof statsData.data?.payments?.total !== 'number' || !Array.isArray(statsData.data?.recent))
      throw new Error('Dashboard stats endpoint failed');
    if (!statsData.data.setup?.walletSet || !statsData.data.setup?.hasApiKey || !statsData.data.setup?.hasWebhook)
      throw new Error('Dashboard stats setup flags are wrong');
    if (!statsData.data.received.some((r: any) => r.currency === 'QI' && parseFloat(r.amount) > 0))
      throw new Error('Dashboard stats did not sum completed QI payments');

    // Test 20: Refresh token rotation (dashboard keeps sessions alive with this)
    console.log('\n2️⃣0️⃣ Testing POST /auth/refresh ...');
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: regData.data.tokens.refreshToken }),
    });
    const refreshData = (await refreshRes.json()) as any;
    console.log('   Status:', refreshRes.status, 'New access token:', Boolean(refreshData.data?.accessToken));
    if (refreshRes.status !== 200 || !refreshData.data?.accessToken || !refreshData.data?.refreshToken)
      throw new Error('Token refresh failed');
    const meRes = await fetch(`${baseUrl}/merchants/me`, { headers: { Authorization: `Bearer ${refreshData.data.accessToken}` } });
    console.log('   Refreshed token works Status:', meRes.status);
    if (meRes.status !== 200) throw new Error('Refreshed access token rejected');

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
    try {
      const { redisClient } = await import('./lib/redis.js');
      await redisClient.quit();
    } catch {
      // ignore
    }
    server.close();
  }
}

runIntegrationTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  });
