/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { createApp } from './app.js';
import type { Server } from 'http';

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

    console.log('\n✨ ALL 10 INTEGRATION TESTS PASSED 100% CLEANLY! ✨\n');
  } finally {
    server.close();
  }
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
