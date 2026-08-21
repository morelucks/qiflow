import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { QiFlow, QiFlowError, verifySignature, constructEvent } from '../dist/index.js';

const secret = 'whsec_test';
const body = JSON.stringify({ event: 'payment.completed', payment: { id: '1', paymentCode: 'pay_x', amount: '1', currency: 'QI', status: 'COMPLETED', txHash: '0x', completedAt: null } });
const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
const now = 1_787_000_000;

test('verifySignature accepts a valid signature and fresh timestamp', () => {
  assert.equal(verifySignature({ rawBody: body, secret, signature: sig, timestamp: now - 10, now }), true);
});
test('verifySignature rejects tampered body, wrong prefix, stale timestamp', () => {
  assert.equal(verifySignature({ rawBody: body + ' ', secret, signature: sig, timestamp: now, now }), false);
  assert.equal(verifySignature({ rawBody: body, secret, signature: sig.slice(7), timestamp: now, now }), false);
  assert.equal(verifySignature({ rawBody: body, secret, signature: sig, timestamp: now - 400, now }), false);
});
test('constructEvent parses when valid and throws QiFlowError otherwise', () => {
  const ev = constructEvent({ rawBody: Buffer.from(body), secret, signature: sig, timestamp: now, now });
  assert.equal(ev.event, 'payment.completed');
  assert.throws(() => constructEvent({ rawBody: body, secret: 'nope', signature: sig, now }), QiFlowError);
});
test('client sends X-API-Key and unwraps data / throws on error envelope', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/v1/payments') && init.method === 'POST') {
      return new Response(JSON.stringify({ success: true, data: { id: 'p1', paymentCode: 'pay_1', checkoutUrl: 'u' } }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: false, error: { code: 'WALLET_NOT_SET', message: 'Set wallet' } }), { status: 400 });
  };
  const qf = new QiFlow({ apiKey: 'qiflow_live_abc', baseUrl: 'https://api.example.test/', fetch: fakeFetch });
  const p = await qf.payments.create({ amount: 1 });
  assert.equal(p.paymentCode, 'pay_1');
  assert.equal(calls[0].init.headers['X-API-Key'], 'qiflow_live_abc');
  assert.equal(calls[0].url, 'https://api.example.test/v1/payments');
  await assert.rejects(() => qf.payments.retrieve('x'), (e) => e instanceof QiFlowError && e.code === 'WALLET_NOT_SET' && e.status === 400);
  const list = await (async () => { try { return await qf.payments.list({ status: 'COMPLETED', limit: 5 }); } catch { return null; } })();
  assert.equal(list, null); // fake returns error envelope for GETs
  assert.ok(calls.at(-1).url.includes('status=COMPLETED&limit=5'));
});
