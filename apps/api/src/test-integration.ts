/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { createApp } from './app.js';
import type { Server } from 'http';

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
    console.log('   Initial raw API Key:', regData.data.apiKey.rawKey);

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

    console.log('\n✨ ALL 10 INTEGRATION TESTS PASSED 100% CLEANLY! ✨\n');
  } finally {
    server.close();
  }
}

runIntegrationTest().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
